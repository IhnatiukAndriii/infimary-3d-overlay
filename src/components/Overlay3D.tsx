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
};

function Model({ url, position, rotation, scale, selected, onUpdate, onSelect, onRemove, controlsEnabled }: ModelProps) {
  const { scene } = (useGLTF(url) as unknown) as { scene: THREE.Object3D };
  const ref = useRef<THREE.Group>(null!);
  const { camera, gl, invalidate } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
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
      // Для hit-зони беремо діагональний радіус, але це не впливає на позицію кнопки
      const radius = size.length() / 2;
      baseRadiusRef.current = Math.max(0.1, radius * 1.6);
      hitCenterRef.current.copy(center);
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
    const scaleFactor = Math.max(scale[0], scale[1], scale[2]);
    const r = baseRadiusRef.current * scaleFactor;
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
    if (ref.current && !isPinching) {
      ref.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [rotation, isPinching]);

  // Синхронізуємо scale імперативно (щоб не перетирати під час pinch)
  useEffect(() => {
    if (ref.current && !isPinching) {
      ref.current.scale.set(scale[0], scale[1], scale[2]);
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
    // Не починати drag під час pinch
    if (isPinching) {
      e.stopPropagation();
      return;
    }
    // Якщо клік в зоні хрестика — видалити, навіть якщо подію перехопила hit-зона
    if (selected && ref.current) {
      try {
        // 1) Екранний хіт-тест у пікселях — найбільш надійний
        if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
          const delLocal = new THREE.Vector3(
            deleteBtnPosition[0],
            deleteBtnPosition[1],
            deleteBtnPosition[2]
          );
          const delWorld = ref.current.localToWorld(delLocal.clone());
          const ndc = delWorld.clone().project(camera);
          const rect = gl.domElement.getBoundingClientRect();
          const px = ((ndc.x + 1) / 2) * rect.width + rect.left;
          const py = ((-ndc.y + 1) / 2) * rect.height + rect.top;
          const dx = e.clientX - px;
          const dy = e.clientY - py;
          const distPx = Math.hypot(dx, dy);
          const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          const thresholdPx = 12 * dpr; // зменшено з ~24px до ~12px
          if (distPx <= thresholdPx) {
            e.stopPropagation();
            onRemove();
            return;
          }
        }

        // 2) Запасний варіант: перетин променя з площиною перед хрестиком
        if (e && e.ray) {
          const delLocal = new THREE.Vector3(
            deleteBtnPosition[0],
            deleteBtnPosition[1],
            deleteBtnPosition[2]
          );
          const delWorld = ref.current.localToWorld(delLocal.clone());

          // Перетин променя з площиною, перпендикулярною камері і що проходить через хрестик
          const normal = new THREE.Vector3();
          camera.getWorldDirection(normal);
          const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, delWorld);
          const planeHit = new THREE.Vector3();
          if (e.ray.intersectPlane(plane, planeHit)) {
            const scaleFactor = Math.max(scale[0], scale[1], scale[2]);
            const threshold = deleteBtnRadius * scaleFactor * 0.9; // зменшений хітбокс відносно візуального радіуса
            if (planeHit.distanceTo(delWorld) <= threshold) {
              e.stopPropagation();
              onRemove();
              return;
            }
          }
        }
      } catch {}
    }

    // Якщо об'єкт ще не обрано — обираємо і одразу починаємо drag в цю ж подію
    if (!selected) {
      onSelect();
    }
    e.stopPropagation();
  setIsDragging(true);
    // Захоплюємо курсор, щоб події приходили стабільно навіть при виході за межі елемента
    if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId != null) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }

    // Зберігаємо початкову точку дотику і початкову позицію об'єкта
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Реєструємо активний pointer (для pinch через Pointer Events)
    if (e.pointerId != null) {
      pointersRef.current.set(e.pointerId, { x: clientX, y: clientY });
      // Якщо це другий палець — ініціюємо pinch одразу
      if (pointersRef.current.size === 2 && ref.current) {
        const arr = Array.from(pointersRef.current.values());
        const dx = arr[1].x - arr[0].x;
        const dy = arr[1].y - arr[0].y;
        const distance = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        setIsDragging(false);
        setIsPinching(true);
        pinchRef.current = {
          initialDistance: Math.max(distance, 1e-6),
          initialAngle: angle,
          initialScale: ref.current.scale.x,
          initialRotY: ref.current.rotation.y,
          lastDistance: distance,
          lastAngle: angle,
          targetScale: ref.current.scale.x,
          targetRotY: ref.current.rotation.y,
        };
        try { invalidate(); } catch {}
      }
    }
    
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
    // Pointer Events pinch: оновлюємо координати по кожному pointer
    if (isPinching && e.pointerId != null) {
      const clientX = e.touches ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: clientX, y: clientY });
      }
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        const arr = Array.from(pointersRef.current.values());
        const dx = arr[1].x - arr[0].x;
        const dy = arr[1].y - arr[0].y;
        pinchRef.current.lastDistance = Math.hypot(dx, dy);
        pinchRef.current.lastAngle = Math.atan2(dy, dx);
        try { invalidate(); } catch {}
      }
      return;
    }
    if (isPinching) return; // безпечне повернення
    // Рухаємося, щойно почали drag, навіть якщо selected ще не встиг оновитись у батька
    if (!isDragging || !dragStartRef.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    lastPointerPosRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = Date.now();
  };

  const handlePointerUp = (e?: any) => {
    // Прибраємо pointer з карти
    if (e && e.pointerId != null) {
      pointersRef.current.delete(e.pointerId);
    }
    // Якщо був pinch і залишився <2 pointers — коміт і завершення pinch
    if (isPinching) {
      if (ref.current) {
        const s = ref.current.scale.x;
        const ry = ref.current.rotation.y;
        onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsPinching(false);
      pinchRef.current = null;
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

    // Pinch оновлення — максимально миттєве застосування без зайвого згладжування
    if (isPinching && pinchRef.current && ref.current) {
      const SENS = 3.0;
      const dead = 0.001;
      const minS = 0.1;
      const maxS = 3;
      const pr = pinchRef.current;
      const rawFactor = pr.lastDistance / pr.initialDistance;
      const factor = Math.abs(rawFactor - 1) < dead ? 1 : Math.pow(rawFactor, SENS);
      const desiredScale = THREE.MathUtils.clamp(pr.initialScale * factor, minS, maxS);
      pr.targetScale = desiredScale;
      const desiredRotY = pr.initialRotY + (pr.lastAngle - pr.initialAngle) * 0.8;
      pr.targetRotY = desiredRotY;

      // Застосовуємо одразу — пріоритет чутливості без відчутної затримки
      ref.current.scale.setScalar(pr.targetScale);
      ref.current.rotation.y = pr.targetRotY;

      invalidate();
    }
  });

  // Тимчасово зменшуємо DPR під час активного drag/pinch для підвищення FPS
  const savedDprRef = useRef<number | null>(null);
  useEffect(() => {
    try {
      if (isDragging || isPinching) {
        if (savedDprRef.current == null) savedDprRef.current = (gl as any).getPixelRatio?.() ?? null;
        (gl as any).setPixelRatio?.(1);
      } else if (savedDprRef.current != null) {
        (gl as any).setPixelRatio?.(savedDprRef.current);
        savedDprRef.current = null;
      }
    } catch {}
  }, [isDragging, isPinching, gl]);

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
    }
  }, [controlsEnabled]);

  // Handle gestures using wheel for scale (desktop) and touch events will be handled via DOM
  useEffect(() => {
    if (!selected || !ref.current) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Ще вища чутливість коліщатка (було 0.0025)
      const delta = e.deltaY * -0.004;
      const newScale = Math.max(0.1, Math.min(3, scale[0] + delta));
      onUpdate({
        scale: [newScale, newScale, newScale]
      });
    };

    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [selected, scale, onUpdate, gl]);

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

  // Touch gestures via DOM for pinch/rotate — тепер оновлення у useFrame для кращої плавності
  useEffect(() => {
    if (!selected) return;

    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2 && ref.current) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const distance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);

        setIsDragging(false); // Вимикаємо drag при двопальцевому жесті
        setIsPinching(true);
        pinchRef.current = {
          initialDistance: Math.max(distance, 1e-6),
          initialAngle: angle,
          initialScale: ref.current.scale.x,
          initialRotY: ref.current.rotation.y,
          lastDistance: distance,
          lastAngle: angle,
          targetScale: ref.current.scale.x,
          targetRotY: ref.current.rotation.y,
        };
        // Запускаємо рендер одразу (frameloop=demand)
        try { invalidate(); } catch {}
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pinchRef.current || e.touches.length !== 2) return;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchRef.current.lastDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchRef.current.lastAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX);
      // Нічого не оновлюємо тут — лише фіксуємо виміри. Рендер іде в useFrame().
      // Але інвалідимо, щоби кадр почався негайно в demand-режимі
      try { invalidate(); } catch {}
    };

    const commitPinchAndReset = () => {
      if (ref.current) {
        const s = ref.current.scale.x;
        const ry = ref.current.rotation.y;
        onUpdate({ scale: [s, s, s], rotation: [rotation[0], ry, rotation[2]] });
      }
      setIsPinching(false);
      pinchRef.current = null;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && isPinching) {
        commitPinchAndReset();
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: true });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [selected, rotation, onUpdate, gl]);

  // Обчислення позиції та розміру 3D кнопки видалення (заміна Html-оверлею)
  const deleteBtnPosition: [number, number, number] = [
    bboxCenterRef.current.x + bboxSizeRef.current.x / 2 + Math.max(0.03, Math.min(0.12, bboxSizeRef.current.x * 0.15)),
    bboxCenterRef.current.y + bboxSizeRef.current.y / 2 + Math.max(0.03, Math.min(0.15, bboxSizeRef.current.y * 0.1)),
    bboxCenterRef.current.z
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
      {/* Невидима збільшена зона торкання навколо моделі */}
      {hitGeomRef.current && (
        <mesh
          position={[hitCenterRef.current.x, hitCenterRef.current.y, hitCenterRef.current.z]}
          geometry={hitGeomRef.current}
          // Робимо меш видимим для raycaster, але повністю прозорим для рендера
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
      {/* 3D кнопка видалення: білборд у верхньо-правому куті моделі */}
      {selected && (
        <Billboard position={deleteBtnPosition} follow>
          <group
            onPointerDown={(e) => { e.stopPropagation(); onRemove(); }}
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            {/* Фонова кнопка-коло */}
            <mesh>
              <circleGeometry args={[deleteBtnRadius, 48]} />
              <meshBasicMaterial color="#ff1744" transparent opacity={0.95} depthTest={false} />
            </mesh>
            {/* Хрестик як дві тонкі планки, щоб не використовувати 3D Text */}
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
      {/* 3D текстова підказка тимчасово вимкнена */}
      {/* Clone створює незалежний інстанс моделі для кожного використання одного і того ж URL */}
      <Clone 
        object={scene}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
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
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [cameraControlEnabled, setCameraControlEnabled] = useState(false);
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
    setLayout([
      ...layout,
      {
        url,
        position: [Math.random() - 0.5, 0, Math.random() - 0.5],
        rotation: [0, 0, 0],
        scale: [1, 1, 1]
      }
    ]);
    setSelectedIdx(layout.length);
  };

  const handleUpdateModel = (idx: number, data: any) => {
    setLayout(layout.map((obj, i) => (i === idx ? { ...obj, ...data } : obj)));
  };

  const handleRemoveModel = (idx: number) => {
    setLayout(layout.filter((_, i) => i !== idx));
    if (selectedIdx === idx) setSelectedIdx(null);
  };

  const handleSaveLayout = () => {
    localStorage.setItem("room-layout", JSON.stringify(layout));
    alert("Room layout saved!");
  };
  const handleLoadLayout = () => {
    const raw = localStorage.getItem("room-layout");
    if (raw) setLayout(JSON.parse(raw));
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
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 10]} />
        <OrbitControls enabled={cameraControlEnabled} enablePan enableZoom />
        <Suspense fallback={null}>
          <PreloadModels urls={layout.map(m => m.url)} />
          {layout.map((m, idx) => (
            <MemoModel
              key={idx}
              {...m}
              mode={mode}
              controlsEnabled={cameraControlEnabled}
              selected={selectedIdx === idx}
              onUpdate={(data: any) => handleUpdateModel(idx, data)}
              onSelect={() => setSelectedIdx(idx)}
              onRemove={() => handleRemoveModel(idx)}
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
          onClick={() => setCameraControlEnabled(!cameraControlEnabled)}
          sx={{ 
            fontWeight: 600,
            minWidth: 140,
            background: cameraControlEnabled ? 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)' : 'transparent',
            '&:hover': {
              background: cameraControlEnabled ? 'linear-gradient(135deg, #ffb300 0%, #ff8f00 100%)' : 'rgba(255, 193, 7, 0.1)',
            }
          }}
        >
          🎥 {cameraControlEnabled ? 'КАМЕРА ON' : 'КАМЕРА OFF'}
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