import React, { useRef, useState, useEffect, Suspense } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Clone, Billboard, Preload } from "@react-three/drei";
import { Button } from "@mui/material";
import * as THREE from "three";
import ModelGallery from "./ModelGallery";
import "./Overlay3D.css";

// Simple Close icon component
const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

type Overlay3DProps = { mode: "mobile" | "desktop" };

type ModelProps = {
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  selected: boolean;
  onUpdate: (data: Partial<Pick<ModelProps, "position" | "rotation" | "scale">>) => void;
  onSelect: () => void;
  mode: "mobile" | "desktop";
  onRemove: () => void;
  controlsEnabled?: boolean;
  layoutEpoch?: number;
  onPinchActiveChange?: (active: boolean) => void;
  onFocusCenter?: (worldCenter: [number, number, number]) => void;
};

function Model({ url, position, rotation, scale, selected, onUpdate, onSelect, onRemove, controlsEnabled, layoutEpoch, onPinchActiveChange, onFocusCenter }: ModelProps) {
  const { scene } = (useGLTF(url) as unknown) as { scene: THREE.Object3D };
  // Створюємо глибоку копію GLTF-сцени один раз на екземпляр моделі,
  // щоб уникнути неочікуваного спільного стану/диспозу між клонованими об'єктами
  const clonedScene = React.useMemo(() => {
    try {
      const c = scene.clone(true);
      // Забезпечимо стабільну взаємодію: вимикаємо frustumCulled і гарантуємо оновлення матриць
      c.traverse((obj: any) => {
        if (obj && typeof obj === 'object') {
          if ('frustumCulled' in obj) obj.frustumCulled = false;
          if ('matrixAutoUpdate' in obj) obj.matrixAutoUpdate = true;
          // Деякі GLTF мають MeshBasicMaterial з transparent: переконаємось, що вони raycastable
          if (obj.isMesh && !obj.raycast) obj.raycast = THREE.Mesh.prototype.raycast;
        }
      });
      return c;
    } catch {
      return scene;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);
  const ref = useRef<THREE.Group>(null!);
  const pivotRef = useRef<THREE.Group>(null!); // центр обертання моделі (bbox-центр)
  const contentRef = useRef<THREE.Group>(null!); // вміст моделі, зсунений на -bboxCenter
  const { camera, gl, invalidate } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    objStart: THREE.Vector3; // початкова позиція об'єкта
    planeNormal: THREE.Vector3; // нормаль площини drag (за замовчуванням до камери)
    planeConstant: number; // константа площини: -n·p
    offset: THREE.Vector3; // objectPos - worldTouch
  } | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const tmpVec3Ref = useRef<THREE.Vector3>(new THREE.Vector3());
  const hitGeomRef = useRef<THREE.SphereGeometry | null>(null);
  const hitCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const bboxCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const bboxSizeRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const hitMeshRef = useRef<THREE.Mesh | null>(null);
  const baseRadiusRef = useRef<number>(0.6);
  const rotateStartYRef = useRef<number>(0);
  // Цілі та поточні значення обертання для плавного згладжування у CAMERA ON
  const rotateTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotateCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Контроль натиску на кнопку видалення
  const deleteEnableAtRef = useRef<number>(0);
  const deletePressRef = useRef<{
    downX: number;
    downY: number;
    time: number;
    wasInside: boolean;
  } | null>(null);
  // Активні pointers для pinch (Pointer Events)
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  // Pinch gesture state
  const pinchRef = useRef<{
    initialDistance: number;
    initialAngle: number;
    initialScale: number;
    initialRotY: number;
    lastDistance: number;
    lastAngle: number;
    prevDistance?: number;
    prevAngle?: number;
    targetScale: number;
    targetRotY: number;
  } | null>(null);

  // Обчислюємо базову геометрію та розміри моделі для hit-зони і позиції кнопки
  useEffect(() => {
    try {
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      // Зберігаємо центр і розмір bbox для коректного розміщення кнопки
      bboxCenterRef.current.copy(center);
      bboxSizeRef.current.copy(size);
      // Нормалізуємо pivot: зсуваємо вміст на -center, а pivot групу ставимо в +center
      if (contentRef.current) {
        contentRef.current.position.set(-center.x, -center.y, -center.z);
      }
      if (pivotRef.current) {
        pivotRef.current.position.set(center.x, center.y, center.z);
        // Для стабільного pitch/yaw обертання використаємо порядок YXZ
        try { pivotRef.current.rotation.order = 'YXZ'; } catch {}
      }
      // Для hit-зони беремо діагональний радіус, але це не впливає на позицію кнопки
      const radius = size.length() / 2;
      baseRadiusRef.current = Math.max(0.1, radius * 1.6);
      hitCenterRef.current.set(0, 0, 0); // у координатах pivot центр дорівнює (0,0,0)
    } catch (e) {
      baseRadiusRef.current = 0.6;
      hitCenterRef.current.set(0, 0, 0);
      bboxCenterRef.current.set(0, 0, 0);
      bboxSizeRef.current.set(1, 1, 1);
    }
    // створюємо геометрію одиничного радіуса один раз
    if (hitGeomRef.current) hitGeomRef.current.dispose();
    hitGeomRef.current = new THREE.SphereGeometry(1, 16, 12);
    return () => {
      if (hitGeomRef.current) {
        hitGeomRef.current.dispose();
        hitGeomRef.current = null;
      }
    };
  }, [scene]);

  // Підганяємо масштаб hit-mesh при зміні масштабу моделі
  useEffect(() => {
    // Тримаймо локальний масштаб хіта рівним базовому радіусу; світовий масштаб
    // буде множитись масштабом pivot (тобто масштабом моделі)
    const r = baseRadiusRef.current;
    if (hitMeshRef.current) {
      hitMeshRef.current.scale.set(r, r, r);
    }
  }, [scale]);

  // Синхронізуємо position
  useEffect(() => {
    if (ref.current && !isDragging) {
      ref.current.position.set(position[0], position[1], position[2]);
    }
  }, [position, isDragging]);

  // Синхронізуємо rotation імперативно (щоб не перетирати під час pinch)
  useEffect(() => {
    if (pivotRef.current && !isPinching && !isRotating) {
      pivotRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [rotation, isPinching, isRotating]);

  // Вмикаємо можливість видалення через невеликий час після того, як модель стала обраною
  useEffect(() => {
    if (selected) {
      deleteEnableAtRef.current = Date.now() + 600; // 600ms grace period після вибору/створення
    } else {
      deleteEnableAtRef.current = 0;
    }
  }, [selected]);

  // Синхронізуємо scale імперативно (щоб не перетирати під час pinch)
  useEffect(() => {
    if (pivotRef.current && !isPinching) {
      pivotRef.current.scale.set(scale[0], scale[1], scale[2]);
    }
  }, [scale, isPinching]);

  // Примітка: підсвічування матеріалів вимкнено, щоб уникнути конфліктів з різними типами матеріалів GLTF

  // Handle drag - ПОКРАЩЕНА АДАПТИВНА ЧУТЛИВІСТЬ
  // Перетворення координат екрана у світову точку перетину з довільною площиною
  const getWorldPointOnPlane = (
    clientX: number,
    clientY: number,
    planeNormal: THREE.Vector3,
    planeConstant: number
  ): THREE.Vector3 | null => {
    const rect = gl.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera({ x, y } as any, camera);
    const plane = new THREE.Plane().set(planeNormal, planeConstant);
    const out = tmpVec3Ref.current;
    const hit = raycasterRef.current.ray.intersectPlane(plane, out);
    return hit ? out.clone() : null;
  };

  const handlePointerDown = (e: any) => {
    // Не починати новий жест під час активного pinch або rotation
    if (isPinching || isRotating) {
      e.stopPropagation();
      return;
    }
    // Якщо клік у зоні хрестика — готуємо видалення (підтвердження на pointerup)
    if (selected && ref.current && Date.now() >= deleteEnableAtRef.current) {
      try {
        // 1) Екранний хіт-тест у пікселях з точним радіусом по проекції
        if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
          const delLocal = new THREE.Vector3(deleteBtnPosition[0], deleteBtnPosition[1], deleteBtnPosition[2]);
          const delWorld = ref.current.localToWorld(delLocal.clone());
          const ndc = delWorld.clone().project(camera);
          const rect = gl.domElement.getBoundingClientRect();
          const px = ((ndc.x + 1) / 2) * rect.width + rect.left;
          const py = ((-ndc.y + 1) / 2) * rect.height + rect.top;
          const dx = e.clientX - px;
          const dy = e.clientY - py;
          const distPx = Math.hypot(dx, dy);
          // проєктуємо радіус кола у пікселі за допомогою напрямку "праворуч" від камери
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
          const scaleFactor = pivotRef.current ? pivotRef.current.scale.x : Math.max(scale[0], scale[1], scale[2]);
          const worldRadius = deleteBtnRadius * scaleFactor;
          const edgeWorld = delWorld.clone().add(camRight.multiplyScalar(worldRadius));
          const edgeNdc = edgeWorld.clone().project(camera);
          const edgePx = ((edgeNdc.x + 1) / 2) * rect.width + rect.left;
          const edgePy = ((-edgeNdc.y + 1) / 2) * rect.height + rect.top;
          const pxRadius = Math.hypot(edgePx - px, edgePy - py);
          const thresholdPx = pxRadius * 0.85; // трохи менше за видимий радіус
          if (distPx <= thresholdPx) {
            // Маркуємо як потенційне видалення, підтвердимо на pointerup
            deletePressRef.current = { downX: e.clientX, downY: e.clientY, time: Date.now(), wasInside: true };
            e.stopPropagation();
            // поки не видаляємо тут — чекаємо pointerup
            return;
          }
        }
      } catch {}
    }

    // Якщо об'єкт ще не обрано — обираємо і одразу фокусуємось
    if (!selected) {
      onSelect();
      // Наводимо центр камери на центр моделі (центр pivot)
      try {
        if (pivotRef.current) {
          const wc = new THREE.Vector3();
          pivotRef.current.getWorldPosition(wc);
          onFocusCenter?.([wc.x, wc.y, wc.z]);
        }
      } catch {}
    }
    // CAMERA ON: тільки обертання навколо своєї осі (одним пальцем)
    if (controlsEnabled) {
      e.stopPropagation();
      setIsRotating(true);
      if (pivotRef.current) {
        rotateStartYRef.current = pivotRef.current.rotation.y;
        rotateCurrentRef.current.x = pivotRef.current.rotation.x;
        rotateCurrentRef.current.y = pivotRef.current.rotation.y;
        rotateTargetRef.current.x = rotateCurrentRef.current.x;
        rotateTargetRef.current.y = rotateCurrentRef.current.y;
      }
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      lastPointerPosRef.current = { x: clientX, y: clientY };
      if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId != null) {
        try { e.target.setPointerCapture(e.pointerId); } catch {}
      }
      try { invalidate(); } catch {}
      return;
    }

    // CAMERA OFF: тільки переміщення (drag)
    e.stopPropagation();
    setIsDragging(true);
    if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId != null) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }

    // Зберігаємо початкову точку дотику і початкову позицію об'єкта
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Pinch вимкнено — не ініціюємо
    
    // Визначаємо площину drag, перпендикулярну напрямку камери і
    // що проходить через поточну позицію об'єкта (екрано-орієнтована площина).
    const objPos = ref.current
      ? ref.current.position.clone()
      : new THREE.Vector3(position[0], position[1], position[2]);
    const normal = new THREE.Vector3();
    camera.getWorldDirection(normal); // напрямок, куди дивиться камера
    // Площина повинна бути перпендикулярна до цього напрямку і проходити через objPos
    const planeConst = -normal.dot(objPos);

    // Обчислюємо точку під пальцем на цій площині
    const worldDown = getWorldPointOnPlane(clientX, clientY, normal, planeConst);
    const offset = worldDown ? objPos.clone().sub(worldDown) : new THREE.Vector3(0, 0, 0);
    
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      objStart: objPos,
      planeNormal: normal.clone(),
      planeConstant: planeConst,
      offset
    };
    
    lastPointerPosRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = Date.now();
  };

  const handlePointerMove = (e: any) => {
    // CAMERA ON: обертання по горизонтальному зсуву
    if (isRotating && pivotRef.current) {
      const clientX = e.touches ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      const last = lastPointerPosRef.current;
      if (last) {
        const dx = clientX - last.x;
        const dy = clientY - last.y;
        const ROT_PER_PX_X = 0.01; // pitch
        const ROT_PER_PX_Y = 0.01; // yaw
        // Оновлюємо цілі кути
        rotateTargetRef.current.y += dx * ROT_PER_PX_Y;
        rotateTargetRef.current.x += -dy * ROT_PER_PX_X; // рух вгору -> позитивний pitch
        // Обмежимо pitch, щоб не перевертати об'єкт
        const maxPitch = Math.PI / 3; // ~60°
        rotateTargetRef.current.x = Math.max(-maxPitch, Math.min(maxPitch, rotateTargetRef.current.x));
        try { invalidate(); } catch {}
      }
      lastPointerPosRef.current = { x: clientX, y: clientY };
      return;
    }
    // Pointer Events pinch: оновлюємо координати по кожному pointer
    if (isPinching && e.pointerId != null) {
      const clientX = e.touches ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: clientX, y: clientY });
      }
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        // стабільний порядок за pointerId
        const arr = Array.from(pointersRef.current.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v);
        const dx = arr[1].x - arr[0].x;
        const dy = arr[1].y - arr[0].y;
        const newDist = Math.hypot(dx, dy);
        const newAngle = Math.atan2(dy, dx);
        // Оновлюємо останні виміри
  const prev = pinchRef.current.prevDistance ?? newDist;
  pinchRef.current.prevDistance = pinchRef.current.lastDistance ?? newDist;
  pinchRef.current.prevAngle = pinchRef.current.lastAngle ?? newAngle;
  pinchRef.current.lastDistance = newDist;
  pinchRef.current.lastAngle = newAngle;
        // Негайне застосування: обчислюємо і ставимо трансформації одразу, без очікування кадру
        if (ref.current) {
          const SENS = 8.4;
          const dead = 0.00025;
          const minS = 0.1;
          const maxS = 3;
          const pr = pinchRef.current;
          // Масштаб: легка екстраполяція; для обертання — тільки інкремент без прогнозу
          const dv = pr.lastDistance - (prev ?? pr.lastDistance);
          const predicted = pr.lastDistance + dv * 1.2;
          const rawFactor = predicted / pr.initialDistance;
          const factor = Math.abs(rawFactor - 1) < dead ? 1 : Math.pow(rawFactor, SENS);
          const desiredScale = controlsEnabled
            ? pr.initialScale
            : THREE.MathUtils.clamp(pr.initialScale * factor, minS, maxS);
          pr.targetScale = desiredScale;
          if (pivotRef.current) {
            pivotRef.current.scale.setScalar(desiredScale);
            // Інкрементальний поворот навколо ВЛАСНОЇ осі Y (локальної)
            let d = (pr.lastAngle ?? newAngle) - (pr.prevAngle ?? newAngle);
            // нормалізація кута до [-PI, PI]
            const PI2 = Math.PI * 2;
            while (d > Math.PI) d -= PI2;
            while (d < -Math.PI) d += PI2;
            const ROT_SENS = 2.2;
            pivotRef.current.rotateOnAxis(new THREE.Vector3(0, 1, 0), d * ROT_SENS);
            pr.targetRotY = pivotRef.current.rotation.y;
          }
        }
        try { invalidate(); } catch {}
      }
      return;
    }
  if (isPinching || controlsEnabled) return; // у CAMERA ON переміщення вимкнено
    // Рухаємося, щойно почали drag, навіть якщо selected ще не встиг оновитись у батька
    if (!isDragging || !dragStartRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    lastPointerPosRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = Date.now();
  };

  const handlePointerUp = (e?: any) => {
    // Підтвердження можливого видалення по кліку (без значного руху і швидко)
    if (deletePressRef.current && e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      const press = deletePressRef.current;
      deletePressRef.current = null;
      const moved = Math.hypot(e.clientX - press.downX, e.clientY - press.downY);
      const quick = Date.now() - press.time < 500;
      if (press.wasInside && moved <= 10 && quick && selected && ref.current && Date.now() >= deleteEnableAtRef.current) {
        // Повторно звіримо, що ми досі всередині екраної кнопки (на випадок масштабів/рухів)
        try {
          const delLocal = new THREE.Vector3(deleteBtnPosition[0], deleteBtnPosition[1], deleteBtnPosition[2]);
          const delWorld = ref.current.localToWorld(delLocal.clone());
          const rect = gl.domElement.getBoundingClientRect();
          const ndc = delWorld.clone().project(camera);
          const px = ((ndc.x + 1) / 2) * rect.width + rect.left;
          const py = ((-ndc.y + 1) / 2) * rect.height + rect.top;
          const dx = e.clientX - px;
          const dy = e.clientY - py;
          const distPx = Math.hypot(dx, dy);
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
          const scaleFactor = pivotRef.current ? pivotRef.current.scale.x : Math.max(scale[0], scale[1], scale[2]);
          const worldRadius = deleteBtnRadius * scaleFactor;
          const edgeWorld = delWorld.clone().add(camRight.multiplyScalar(worldRadius));
          const edgeNdc = edgeWorld.clone().project(camera);
          const edgePx = ((edgeNdc.x + 1) / 2) * rect.width + rect.left;
          const edgePy = ((-edgeNdc.y + 1) / 2) * rect.height + rect.top;
          const pxRadius = Math.hypot(edgePx - px, edgePy - py);
          const thresholdPx = pxRadius * 0.85;
          if (distPx <= thresholdPx) {
            onRemove();
            return;
          }
        } catch {}
      }
    }
    // Завершення обертання
    if (isRotating) {
      if (pivotRef.current) {
        const ry = pivotRef.current.rotation.y;
        onUpdate({ rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsRotating(false);
      lastPointerPosRef.current = null;
      return;
    }
    // Прибраємо pointer з карти
    if (e && e.pointerId != null) {
      pointersRef.current.delete(e.pointerId);
    }
    // Якщо був pinch і залишився <2 pointers — коміт і завершення pinch
    if (isPinching) {
      if (pivotRef.current) {
        const s = pivotRef.current.scale.x;
        const ry = pivotRef.current.rotation.y;
        onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
      return;
    }
    // Фінал для drag
    if (ref.current) {
      const finalPos = ref.current.position;
      onUpdate({ position: [finalPos.x, finalPos.y, finalPos.z] });
    }
    setIsDragging(false);
    dragStartRef.current = null;
    lastPointerPosRef.current = null;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Плавне оновлення позиції під час drag кожен кадр
  useFrame((_, delta) => {
    // Drag оновлення
    if (isDragging && dragStartRef.current && ref.current) {
      const lp = lastPointerPosRef.current;
      if (lp) {
        const world = getWorldPointOnPlane(
          lp.x,
          lp.y,
          dragStartRef.current.planeNormal,
          dragStartRef.current.planeConstant
        );
        if (world) {
          const pos = world.clone().add(dragStartRef.current.offset);
          ref.current.position.set(pos.x, pos.y, pos.z);
          invalidate();
        }
      }
    }

    // Pinch оновлення — максимально "живе": застосовуємо цільові значення одразу кожен кадр
    if (isPinching && pinchRef.current && ref.current) {
      const pr = pinchRef.current;
      // Якщо з pointermove вже пораховані targetScale/targetRotY — просто застосовуємо
      if (Number.isFinite(pr.targetScale) && Number.isFinite(pr.targetRotY)) {
        if (pivotRef.current) {
          pivotRef.current.scale.setScalar(pr.targetScale);
          // rotation вже застосовано інкрементально у pointermove
        }
      } else {
        // fallback: швидкий прямий перерахунок без згладжування
        const SENS = 8.4;
        const dead = 0.00025;
        const minS = 0.1;
        const maxS = 3;
        const prev = pr.prevDistance ?? pr.lastDistance;
        const dv = pr.lastDistance - prev;
        const predicted = pr.lastDistance + dv * 1.0;
        const rawFactor = predicted / pr.initialDistance;
        const factor = Math.abs(rawFactor - 1) < dead ? 1 : Math.pow(rawFactor, SENS);
        const desiredScale = controlsEnabled
          ? pr.initialScale
          : THREE.MathUtils.clamp(pr.initialScale * factor, minS, maxS);
        pr.targetScale = desiredScale;
        if (pivotRef.current) {
          pivotRef.current.scale.setScalar(desiredScale);
          // Інкрементальний поворот на різницю кутів у fallback
          if (pr.prevAngle != null && pr.lastAngle != null) {
            let dAng = pr.lastAngle - pr.prevAngle;
            const PI2 = Math.PI * 2;
            while (dAng > Math.PI) dAng -= PI2;
            while (dAng < -Math.PI) dAng += PI2;
            const ROT_SENS = 2.2;
            pivotRef.current.rotateOnAxis(new THREE.Vector3(0, 1, 0), dAng * ROT_SENS);
          }
        }
      }

      invalidate();
    }

    // CAMERA ON: плавне обертання до цільових кутів (м'яке згладжування)
    if (isRotating && pivotRef.current) {
      // експоненційне згладжування, стабільне до FPS
      const k = 12; // швидкість сходження
      const s = 1 - Math.exp(-k * Math.max(0.001, delta));
      // оновлюємо поточні значення до цілей
      rotateCurrentRef.current.x += (rotateTargetRef.current.x - rotateCurrentRef.current.x) * s;
      rotateCurrentRef.current.y += (rotateTargetRef.current.y - rotateCurrentRef.current.y) * s;
      // застосовуємо до pivot
      pivotRef.current.rotation.set(rotateCurrentRef.current.x, rotateCurrentRef.current.y, 0);
      invalidate();
    }
  });

  // Тимчасово зменшуємо DPR під час активного drag/pinch для підвищення FPS
  const savedDprRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      if (isDragging || isPinching || isRotating) {
        if (savedDprRef.current == null) savedDprRef.current = (gl as any).getPixelRatio?.() ?? null;
        (gl as any).setPixelRatio?.(1);
      } else if (savedDprRef.current != null) {
        (gl as any).setPixelRatio?.(savedDprRef.current);
        savedDprRef.current = null;
      }
    } catch {}
  }, [isDragging, isPinching, isRotating, gl]);

  // Глобальний страховий ресет на випадок загубленого pointerup/touchend
  useEffect(() => {
    const onAnyUp = () => {
      if (isDragging) {
        handlePointerUp();
      } else if (isRotating) {
        handlePointerUp();
      } else if (isPinching) {
        // Коміт pinch і скидання
        if (pivotRef.current) {
          const s = pivotRef.current.scale.x;
          const ry = pivotRef.current.rotation.y;
          onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
        }
        setIsPinching(false);
        pinchRef.current = null;
        try { onPinchActiveChange?.(false); } catch {}
        pointersRef.current.clear();
      }
    };
    document.addEventListener('pointerup', onAnyUp, { passive: true });
    document.addEventListener('pointercancel', onAnyUp, { passive: true });
    document.addEventListener('touchend', onAnyUp, { passive: true });
    document.addEventListener('touchcancel', onAnyUp, { passive: true });
    return () => {
      document.removeEventListener('pointerup', onAnyUp as any);
      document.removeEventListener('pointercancel', onAnyUp as any);
      document.removeEventListener('touchend', onAnyUp as any);
      document.removeEventListener('touchcancel', onAnyUp as any);
    };
  }, [isDragging, isPinching, isRotating, onUpdate, rotation]);

  // Ресет жести при зміні складу layout (додавання/видалення)
  useEffect(() => {
    if (layoutEpoch == null) return;
    // Безпечне завершення активних жестів і очищення вказівників
    if (isDragging) {
      handlePointerUp();
    }
    if (isPinching) {
      if (pivotRef.current) {
        const s = pivotRef.current.scale.x;
        const ry = pivotRef.current.rotation.y;
        onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
    }
    pointersRef.current.clear();
  }, [layoutEpoch]);

  // Якщо вмикаються OrbitControls, коректно завершуємо drag, щоб не було "стрибків" або зникнення
  useEffect(() => {
    if (!controlsEnabled) return;
    if (isDragging) {
      handlePointerUp();
    }
    if (isPinching) {
      // Коміт масштабу/обертання і вихід з pinch
      if (ref.current) {
        const s = ref.current.scale.x;
        const ry = ref.current.rotation.y;
        onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
    }
  }, [controlsEnabled]);

  // Handle gestures using wheel for scale (desktop) and touch events will be handled via DOM
  useEffect(() => {
    // Вимикаємо масштабування колесом у всіх режимах
    return;
  }, [selected, scale, onUpdate, gl, controlsEnabled]);

  // НОВИЙ: Глобальний слухач для drag - модель слідує за пальцем завжди
  useEffect(() => {
    // Під час drag слухаємо глобальні події, не залежачи від selected
    if (!isDragging) return;

    const canvas = gl.domElement;

    const handleGlobalMove = (e: TouchEvent | PointerEvent) => {
      if (!dragStartRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      lastPointerPosRef.current = { x: clientX, y: clientY };
      lastMoveTimeRef.current = Date.now();
    };

    const handleGlobalEnd = () => {
      // Фінальне оновлення state
      if (ref.current) {
        const finalPos = ref.current.position;
        onUpdate({ position: [finalPos.x, finalPos.y, finalPos.z] });
      }
      
      // Очищення
      setIsDragging(false);
      dragStartRef.current = null;
      lastPointerPosRef.current = null;
    };

    // Слухаємо на всьому canvas і document
    canvas.addEventListener('touchmove', handleGlobalMove as any, { passive: true });
    canvas.addEventListener('pointermove', handleGlobalMove as any, { passive: true });
    document.addEventListener('touchmove', handleGlobalMove as any, { passive: true });
    document.addEventListener('pointermove', handleGlobalMove as any, { passive: true });
    
    canvas.addEventListener('touchend', handleGlobalEnd);
    canvas.addEventListener('pointerup', handleGlobalEnd);
    document.addEventListener('touchend', handleGlobalEnd);
    document.addEventListener('pointerup', handleGlobalEnd);

    return () => {
      canvas.removeEventListener('touchmove', handleGlobalMove as any);
      canvas.removeEventListener('pointermove', handleGlobalMove as any);
      document.removeEventListener('touchmove', handleGlobalMove as any);
      document.removeEventListener('pointermove', handleGlobalMove as any);
      
      canvas.removeEventListener('touchend', handleGlobalEnd);
      canvas.removeEventListener('pointerup', handleGlobalEnd);
      document.removeEventListener('touchend', handleGlobalEnd);
      document.removeEventListener('pointerup', handleGlobalEnd);
    };
  }, [isDragging, position, onUpdate, gl]);

  // Видалено дублювання pinch на Touch Events — тепер тільки Pointer Events

  // Додаткові глобальні Pointer Events під час pinch для високої частоти оновлень
  useEffect(() => {
    if (!isPinching) return;
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => handlePointerMove(e as any);
    const onUp = (e: PointerEvent) => handlePointerUp(e as any);
    const onCancel = (e: PointerEvent) => handlePointerUp(e as any);
    const onRaw = (e: Event) => handlePointerMove(e as any);
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerup', onUp, { passive: true });
    canvas.addEventListener('pointercancel', onCancel, { passive: true });
    (canvas as any).addEventListener?.('pointerrawupdate', onRaw, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    return () => {
      canvas.removeEventListener('pointermove', onMove as any);
      canvas.removeEventListener('pointerup', onUp as any);
      canvas.removeEventListener('pointercancel', onCancel as any);
      (canvas as any).removeEventListener?.('pointerrawupdate', onRaw as any);
      document.removeEventListener('pointermove', onMove as any);
      document.removeEventListener('pointerup', onUp as any);
      document.removeEventListener('pointercancel', onCancel as any);
    };
  }, [isPinching, gl, handlePointerMove, handlePointerUp]);

  // Додаткові глобальні Pointer Events під час rotation (CAMERA ON) для максимальної частоти оновлень
  useEffect(() => {
    if (!isRotating) return;
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => handlePointerMove(e as any);
    const onUp = (e: PointerEvent) => handlePointerUp(e as any);
    const onCancel = (e: PointerEvent) => handlePointerUp(e as any);
    const onRaw = (e: Event) => handlePointerMove(e as any);
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerup', onUp, { passive: true });
    canvas.addEventListener('pointercancel', onCancel, { passive: true });
    (canvas as any).addEventListener?.('pointerrawupdate', onRaw, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    return () => {
      canvas.removeEventListener('pointermove', onMove as any);
      canvas.removeEventListener('pointerup', onUp as any);
      canvas.removeEventListener('pointercancel', onCancel as any);
      (canvas as any).removeEventListener?.('pointerrawupdate', onRaw as any);
      document.removeEventListener('pointermove', onMove as any);
      document.removeEventListener('pointerup', onUp as any);
      document.removeEventListener('pointercancel', onCancel as any);
    };
  }, [isRotating, gl, handlePointerMove, handlePointerUp]);

  // Обчислення позиції та розміру 3D кнопки видалення (заміна Html-оверлею)
  // Позиція кнопки відносно pivot (центр = 0,0,0)
  const deleteBtnPosition: [number, number, number] = [
    bboxSizeRef.current.x / 2 + Math.max(0.03, Math.min(0.12, bboxSizeRef.current.x * 0.15)),
    bboxSizeRef.current.y / 2 + Math.max(0.03, Math.min(0.15, bboxSizeRef.current.y * 0.1)),
    0
  ];
  const deleteBtnRadius = Math.max(0.05, Math.min(0.14, Math.max(bboxSizeRef.current.x, bboxSizeRef.current.y) * 0.12));

  // Позиція та розміри 3D підказки (label) про керування, коли об'єкт обрано
  // Примітка: 3D текст тимчасово не використовуємо, щоб уникнути конфлікту версій; за потреби замінимо на CanvasTexture пізніше

  return (
    <group
      ref={ref}
      // Позицію/обертання/масштаб тепер керуємо імперативно через ref,
      // щоб React-пропси не перетирали оновлення під час жестів
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      dispose={null}
    >
      {/* Вісь обертання у центрі bbox */}
      <group ref={pivotRef}>
        {/* Невидима збільшена зона торкання навколо моделі (у координатах pivot) */}
        {hitGeomRef.current && (
          <mesh
            position={[hitCenterRef.current.x, hitCenterRef.current.y, hitCenterRef.current.z]}
            geometry={hitGeomRef.current}
            visible={true}
            ref={(m) => { hitMeshRef.current = m; }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <meshBasicMaterial color="#000000" transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        {/* 3D кнопка видалення, кріпиться до pivot, щоб обертатись разом з моделлю */}
        {selected && (
          <Billboard position={deleteBtnPosition} follow>
            <group
              onPointerDown={(e) => { e.stopPropagation(); onRemove(); }}
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <mesh>
                <circleGeometry args={[deleteBtnRadius, 48]} />
                <meshBasicMaterial color="#ff1744" transparent opacity={0.95} depthTest={false} />
              </mesh>
              <group position={[0, 0, 0.001]}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <planeGeometry args={[deleteBtnRadius * 1.4, deleteBtnRadius * 0.22]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <planeGeometry args={[deleteBtnRadius * 1.4, deleteBtnRadius * 0.22]} />
                  <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthTest={false} />
                </mesh>
              </group>
            </group>
          </Billboard>
        )}
        {/* Вміст моделі зсунений так, щоб pivot був у центрі */}
        <group ref={contentRef}>
          <primitive
            object={clonedScene}
            dispose={null}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </group>
      </group>
    </group>
  );
}

// Мемоізуємо модель, щоб не перевідмальовувати зайвий раз, коли не змінювались її пропси
const MemoModel = React.memo(Model);

// Компонент попереднього завантаження GLTF (з поточного layout та бібліотеки)
const PreloadModels: React.FC<{ urls: string[] }> = ({ urls }) => {
  useEffect(() => {
    const set = new Set<string>(urls);
    try {
      const lib = localStorage.getItem('model-library');
      if (lib) {
        const items = JSON.parse(lib) as Array<{ url: string }>;
        items.forEach((i) => i?.url && set.add(i.url));
      }
    } catch {}
    set.forEach((u) => {
      try { (useGLTF as any).preload?.(u); } catch {}
    });
  }, [urls]);
  return null;
};

const Overlay3D: React.FC<Overlay3DProps> = ({ mode }) => {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [layout, setLayout] = useState<any[]>([]);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cameraControlEnabled, setCameraControlEnabled] = useState(false);
  const controlsRef = useRef<any>(null);
  const lastCentersRef = useRef<Map<string, [number, number, number]>>(new Map());
  const [pinchingIds, setPinchingIds] = useState<Set<string>>(new Set());
  // isolation mode видалено

  useEffect(() => {
    if (mode === "mobile") {
      let isMounted = true;
      let currentStream: MediaStream | null = null;

      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment" } 
          });
          
          if (!isMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }

          currentStream = stream;
          setVideoStream(stream);
          
          const videoEl = document.getElementById("video-bg") as HTMLVideoElement;
          if (videoEl && isMounted) {
            // Очищаємо попередній стрім
            if (videoEl.srcObject) {
              const oldStream = videoEl.srcObject as MediaStream;
              oldStream.getTracks().forEach(track => track.stop());
            }
            
            videoEl.srcObject = stream;
            
            // Чекаємо на метадані перед запуском
            await new Promise<void>((resolve) => {
              videoEl.onloadedmetadata = () => {
                if (isMounted) {
                  videoEl.play().catch(() => {
                    // Ігноруємо помилки play()
                  });
                }
                resolve();
              };
            });
            
            setVideo(videoEl);
          }
        } catch (err) {
          if (isMounted) {
            console.error('Cannot access camera:', err);
          }
        }
      })();

      return () => {
        isMounted = false;
        if (currentStream) {
          currentStream.getTracks().forEach(track => track.stop());
        }
        if (videoStream) {
          videoStream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [mode]);

  const handleAddModel = (url: string) => {
    const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    const item = {
      id,
      url,
      position: [Math.random() - 0.5, 0, Math.random() - 0.5] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    };
    setLayout((prev) => {
      const next = [...prev, item];
      return next;
    });
    setLayoutEpoch((e) => e + 1);
    setSelectedId(id);
  };

  const handleUpdateModel = (id: string, data: any) => {
    setLayout((prev) => {
      const next = prev.map((obj) => (obj.id === id ? { ...obj, ...data } : obj));
      return next;
    });
  };

  const handleRemoveModel = (id: string) => {
    setLayout((prev) => {
      const next = prev.filter((obj) => obj.id !== id);
      return next;
    });
    setLayoutEpoch((e) => e + 1);
    if (selectedId === id) setSelectedId(null);
  };

  const handleSaveLayout = () => {
    localStorage.setItem("room-layout", JSON.stringify(layout));
    alert("Room layout saved!");
  };
  const handleLoadLayout = () => {
    const raw = localStorage.getItem("room-layout");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Додаємо id для старих збережень без нього
        const withIds = Array.isArray(parsed)
          ? parsed.map((o) => (o && o.id ? o : { ...o, id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`) }))
          : [];
        setLayout(withIds);
        setLayoutEpoch((e) => e + 1);
        // Скидаємо вибір, щоб уникати неконсистентності
        setSelectedId(null);
      } catch {
        setLayout([]);
      }
    }
  };

  const handleScreenshot = () => {
    console.log("=== SCREENSHOT START ===");
    
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const videoEl = document.getElementById("video-bg") as HTMLVideoElement;
    
    if (!canvas) {
      alert("Canvas not found!");
      return;
    }

    // Отримуємо розміри
    const width = canvas.width;
    const height = canvas.height;
    
    console.log("Canvas size:", { width, height });
    console.log("Video element:", videoEl);

    // Створюємо тимчасовий canvas для композиції
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    
    if (!ctx) {
      alert("Cannot create canvas context!");
      return;
    }

    try {
      // 1) Спочатку малюємо відео (якщо є)
      if (mode === "mobile" && videoEl && videoEl.videoWidth > 0) {
        console.log("Drawing video:", {
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight
        });
        ctx.drawImage(videoEl, 0, 0, width, height);
      } else {
        // Якщо немає відео - білий фон
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      // 2) Потім малюємо Three.js canvas поверх
      console.log("Drawing Three.js canvas");
      ctx.drawImage(canvas, 0, 0, width, height);

      // 3) Експортуємо
      const dataURL = tempCanvas.toDataURL("image/png");
      console.log("Image created, length:", dataURL.length);
      
      if (dataURL.length < 1000) {
        alert("Image seems empty! Length: " + dataURL.length);
        return;
      }

      // 4) Завантажуємо
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = `infimary-room-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      console.log("=== SCREENSHOT SUCCESS ===");
    } catch (error) {
      console.error("Screenshot error:", error);
      alert("Помилка при збереженні: " + error);
    }
  };

  // Вилучено фонову площину з відео-текстурою на користь прозорого Canvas поверх DOM-відео

  // ОДИН СПІЛЬНИЙ flex-контейнер для ВСІХ кнопок
  return (
    <div className="overlayRoot">
      {mode === "mobile" && (
        <video id="video-bg" autoPlay playsInline muted className="videoBg" width={640} height={480} />
      )}
      <Canvas
        className="r3fCanvas"
        camera={{ position: [0, 3, 6], fov: 75 }}
        dpr={[1, Math.min(2, window.devicePixelRatio || 1)]}
        frameloop="demand"
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true, stencil: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          // Трохи швидше: вимикаємо складний tone mapping
          gl.toneMapping = THREE.NoToneMapping;
          // Гарантуємо, що браузер не перехоплює жест прокрутки/масштабу
          try { gl.domElement.style.touchAction = 'none'; } catch {}
        }}
      >
  {/* Drei Performance not available in current version; skipping dynamic tuning */}
        {/* Примусовий кадр та оновлення матриць при зміні складу layout */}
        {/** Викликає invalidate і оновлює matrixWorld, щоб raycast одразу працював після add/remove */}
        <EpochInvalidator epoch={layoutEpoch} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 10]} />
        <OrbitControls
          ref={controlsRef}
          enabled={false}
          enablePan={false}
          enableZoom={false}
          enableRotate={false}
        />
        <Suspense fallback={null}>
          <PreloadModels urls={layout.map(m => m.url)} />
          {layout.map((m) => (
            <MemoModel
              key={`${m.id}-${layoutEpoch}`}
              {...m}
              mode={mode}
              controlsEnabled={cameraControlEnabled && pinchingIds.size === 0}
              selected={selectedId === m.id}
              layoutEpoch={layoutEpoch}
              onUpdate={(data: any) => handleUpdateModel(m.id, data)}
              onSelect={() => setSelectedId(m.id)}
              onRemove={() => handleRemoveModel(m.id)}
              onPinchActiveChange={(active: boolean) => {
                setPinchingIds((prev) => {
                  const next = new Set(prev);
                  if (active) next.add(m.id);
                  else next.delete(m.id);
                  return next;
                });
              }}
              onFocusCenter={(worldCenter) => {
                lastCentersRef.current.set(m.id, worldCenter);
                if (controlsRef.current?.target) {
                  controlsRef.current.target.set(worldCenter[0], worldCenter[1], worldCenter[2]);
                  try { controlsRef.current.update(); } catch {}
                }
              }}
            />
          ))}
          <Preload all />
        </Suspense>
      </Canvas>

      {/* Лейбл підказки перенесено у 3D, DOM-підказка вилучена */}

      <div className="toolbar">
        <ModelGallery onAdd={handleAddModel} />
        <Button 
          variant={cameraControlEnabled ? "contained" : "outlined"}
          color="warning"
          onClick={() => {
            const next = !cameraControlEnabled;
            setCameraControlEnabled(next);
            // Якщо вмикаємо камеру і є обраний об'єкт — фокусуємось на ньому
            if (next && selectedId) {
              const c = lastCentersRef.current.get(selectedId);
              if (c && controlsRef.current?.target) {
                controlsRef.current.target.set(c[0], c[1], c[2]);
                try { controlsRef.current.update(); } catch {}
              }
            }
          }}
          sx={{ 
            fontWeight: 600,
            minWidth: 140,
            background: cameraControlEnabled ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' : 'transparent',
            '&:hover': {
              background: cameraControlEnabled ? 'linear-gradient(135deg, #ffb300 0%, #ff8f00 100%)' : 'rgba(255, 193, 7, 0.1)',
            }
          }}
        >
          {cameraControlEnabled ? 'Rotate mode' : 'Move mode'}
        </Button>
        {/* ISOLATION MODE видалено з інтерфейсу */}
        <Button variant="contained" onClick={handleScreenshot}>SAVE IMAGE</Button>
        <Button variant="contained" onClick={handleSaveLayout}>SAVE LAYOUT</Button>
        <Button variant="contained" onClick={handleLoadLayout}>LOAD LAYOUT</Button>
      </div>
    </div>
  );
};

export default Overlay3D;

// Допоміжний компонент усередині Canvas: форсує кадр після змін списку моделей
const EpochInvalidator: React.FC<{ epoch: number }> = ({ epoch }) => {
  const { scene, invalidate } = useThree();
  useEffect(() => {
    try {
      scene.updateMatrixWorld(true);
    } catch {}
    try { invalidate(); } catch {}
    const t = setTimeout(() => {
      try { scene.updateMatrixWorld(true); } catch {}
      try { invalidate(); } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, [epoch]);
  return null;
};