import React, { useRef, useState, useEffect, Suspense, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Clone, Billboard, Preload } from "@react-three/drei";
import { Button } from "@mui/material";
import * as THREE from "three";
import ModelGallery from "./ModelGallery";
import "./Overlay3D.css";


const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

export type ModelData = {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};

type Overlay3DProps = {
  mode: "mobile" | "desktop";
  layout: ModelData[];
  onLayoutChange: (layout: ModelData[]) => void;
};

type ModelProps = {
  modelId: string;
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
  activeGestureId?: string | null;
  onGestureStart?: (id: string, type: 'drag' | 'rotate' | 'pinch') => boolean;
  onGestureEnd?: (id: string, type: 'drag' | 'rotate' | 'pinch') => void;
};

function Model({ modelId, url, position, rotation, scale, selected, onUpdate, onSelect, onRemove, controlsEnabled, layoutEpoch, onPinchActiveChange, onFocusCenter, activeGestureId, onGestureStart, onGestureEnd }: ModelProps) {
  const { scene } = (useGLTF(url) as unknown) as { scene: THREE.Object3D };
  
  // 🔒 Memoize position prop to prevent unnecessary re-syncs when only `selected` changes
  const stablePosition = React.useMemo<[number, number, number]>(() => {
    return [position[0], position[1], position[2]];
  }, [position[0], position[1], position[2]]);
  
  const [localPosition, setLocalPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [localRotation, setLocalRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [localScale, setLocalScale] = useState<[number, number, number]>([1, 1, 1]);
  
  
  const initializedRef = useRef(false);
  const isSelectingRef = useRef(false); // 🔒 Block position updates during selection changes
  
  
  
  const clonedScene = React.useMemo(() => {
    try {
      const c = scene.clone(true);
      
      c.traverse((obj: any) => {
        if (obj && typeof obj === 'object') {
          
          if ('matrixAutoUpdate' in obj) obj.matrixAutoUpdate = true;
          
          if (obj.isMesh && !obj.raycast) obj.raycast = THREE.Mesh.prototype.raycast;
        }
      });
      return c;
    } catch {
      return scene;
    }
    
  }, [scene]);

  
  useEffect(() => {
    return () => {
      try {
        if (clonedScene && clonedScene !== scene) {
          clonedScene.traverse((obj: any) => {
            if (!obj) return;
            if (obj.geometry && typeof obj.geometry.dispose === 'function') {
              try { obj.geometry.dispose(); } catch {}
            }
            if (obj.material) {
              const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
              mats.forEach((m: any) => {
                if (!m) return;
                
                ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap','alphaMap','bumpMap','displacementMap','envMap','lightMap','specularMap','clearcoatNormalMap'].forEach((key) => {
                  const tex = (m as any)[key];
                  if (tex && typeof tex.dispose === 'function') {
                    try { tex.dispose(); } catch {}
                  }
                });
                if (typeof m.dispose === 'function') {
                  try { m.dispose(); } catch {}
                }
              });
            }
          });
        }
      } catch {}
    };
  }, [clonedScene, scene]);
  const ref = useRef<THREE.Group>(null!);
  const pivotRef = useRef<THREE.Group>(null!); 
  const contentRef = useRef<THREE.Group>(null!); 
  const { camera, gl, invalidate } = useThree();
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const dragStartRef = useRef<{
    modelId: string; 
    x: number;
    y: number;
    objStart: THREE.Vector3; 
    planeNormal: THREE.Vector3; 
    planeConstant: number; 
    offset: THREE.Vector3; 
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
  
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
  const lastDragPlaneRef = useRef<{ normal: THREE.Vector3; point: THREE.Vector3 } | null>(null);
  
  const canvasRectRef = useRef<DOMRect | null>(null);
  
  const rotateTargetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rotateCurrentRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const activeDragPointerIdRef = useRef<number | null>(null);
  
  const dragActivatedRef = useRef<boolean>(false);
  const DRAG_THRESHOLD_PX = 4;
  
  const lastGestureEndTimeRef = useRef<number>(0);
  
  const dragEndingRef = useRef<boolean>(false);
  
  const pendingDragRef = useRef<null | {
    modelId: string;
    x: number; y: number;
    objStart: THREE.Vector3;
    planeNormal: THREE.Vector3;
    planeConstant: number;
    offset: THREE.Vector3;
  }>(null);
  
  const deleteEnableAtRef = useRef<number>(0);
  
  const dragEnableAtRef = useRef<number>(0);
  const deletePressRef = useRef<{
    downX: number;
    downY: number;
    time: number;
    wasInside: boolean;
  } | null>(null);
  
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  
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
  const lastPropPositionForLocalRef = useRef<[number, number, number] | null>(null);
  const lastPropPositionForRefSyncRef = useRef<[number, number, number] | null>(null);
  const arePositionsClose = useCallback((a: [number, number, number], b: [number, number, number], eps = 0.0001) => {
    return (
      Math.abs(a[0] - b[0]) <= eps &&
      Math.abs(a[1] - b[1]) <= eps &&
      Math.abs(a[2] - b[2]) <= eps
    );
  }, []);
  const pendingLocalSyncRef = useRef<[number, number, number] | null>(null);
  const pendingRefSyncRef = useRef<[number, number, number] | null>(null);
  const lastParentPropPositionRef = useRef<[number, number, number] | null>(null);
  const commitLocalPosition = (next: [number, number, number]) => {
    setLocalPosition(next);
    lastPropPositionForLocalRef.current = [...next] as [number, number, number];
  };
  const commitRefPosition = (next: [number, number, number]) => {
    // 🔒 NEVER update position during selection changes
    if (isSelectingRef.current) {
      console.log(`[${modelId.slice(0,8)}] ⏸️ commitRefPosition blocked - selection changing`);
      pendingRefSyncRef.current = [...next] as [number, number, number];
      return;
    }
    
    if (!ref.current) {
      pendingRefSyncRef.current = [...next] as [number, number, number];
      return;
    }
    ref.current.position.set(next[0], next[1], next[2]);
    lastPropPositionForRefSyncRef.current = [...next] as [number, number, number];
  };

  
  useEffect(() => {
    try {
      const box = new THREE.Box3().setFromObject(scene);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      
      bboxCenterRef.current.copy(center);
      bboxSizeRef.current.copy(size);
      
      if (contentRef.current) {
        contentRef.current.position.set(-center.x, -center.y, -center.z);
      }
      if (pivotRef.current) {
        pivotRef.current.position.set(center.x, center.y, center.z);
        
        try { pivotRef.current.rotation.order = 'YXZ'; } catch {}
      }
      
      const radius = size.length() / 2;
      baseRadiusRef.current = Math.max(0.1, radius * 1.6);
      hitCenterRef.current.set(0, 0, 0); 
    } catch (e) {
      baseRadiusRef.current = 0.6;
      hitCenterRef.current.set(0, 0, 0);
      bboxCenterRef.current.set(0, 0, 0);
      bboxSizeRef.current.set(1, 1, 1);
    }
    
    if (hitGeomRef.current) hitGeomRef.current.dispose();
    hitGeomRef.current = new THREE.SphereGeometry(1, 16, 12);
    return () => {
      if (hitGeomRef.current) {
        hitGeomRef.current.dispose();
        hitGeomRef.current = null;
      }
    };
  }, [scene]);

  
  useEffect(() => {
    
    
    const r = baseRadiusRef.current;
    if (hitMeshRef.current) {
      hitMeshRef.current.scale.set(r, r, r);
    }
  }, [scale]);

  
  const initialPositionSet = useRef(false);
  useEffect(() => {
    if (ref.current && !initialPositionSet.current) {
      
      ref.current.position.set(stablePosition[0], stablePosition[1], stablePosition[2]);
      console.log(`[${modelId.slice(0,8)}] Initialized ref.position from props:`, stablePosition);
      
      
      const actualPos: [number, number, number] = [
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z
      ];
      commitLocalPosition(actualPos);
      setLocalRotation(rotation);
      setLocalScale(scale);
      lastPropPositionForRefSyncRef.current = [...actualPos] as [number, number, number];
  lastParentPropPositionRef.current = [...actualPos] as [number, number, number];
      
      console.log(`[${modelId.slice(0,8)}] Set localPosition from ref:`, actualPos);
      
      initialPositionSet.current = true;
      initializedRef.current = true;
    }
  }, [stablePosition, rotation, scale, modelId]);
  
  
  
  
  
  
  
  
  // ✅ UNIFIED SYNC: Synchronize BOTH localPosition and ref.position from props
  // This replaces 3 separate useEffects that were conflicting
  useEffect(() => {
    if (!initializedRef.current) {
      console.log(`[${modelId.slice(0,8)}] ⏸️ Unified sync skipped - not initialized yet`);
      return;
    }

    // 🔒 CRITICAL: Block position updates during selection changes
    if (isSelectingRef.current) {
      console.log(`[${modelId.slice(0,8)}] ⏸️ Unified sync skipped - selection changing`);
      return;
    }

    // CRITICAL FIX: Skip sync during selection changes
    // When a model is selected/deselected, we should NOT sync positions
    // This prevents teleportation when switching between models
    if (isDragging || isPinching || isRotating) {
      console.log(`[${modelId.slice(0,8)}] ⏸️ Unified sync skipped - gesture active`);
      return;
    }

    const nextFromProps: [number, number, number] = [stablePosition[0], stablePosition[1], stablePosition[2]];
    const parentPrev = lastParentPropPositionRef.current;
    const changed = !parentPrev || !arePositionsClose(parentPrev, nextFromProps);

    console.log(
      `[${modelId.slice(0,8)}] 🔄 Unified sync check:`,
      'changed:', changed,
      'prev:', parentPrev,
      'next:', nextFromProps,
      'selected:', selected,
      'refPos:', ref.current ? [ref.current.position.x, ref.current.position.y, ref.current.position.z].map(v => v.toFixed(3)) : 'no-ref'
    );

    if (!changed) {
      // Position hasn't changed, skip all syncs
      console.log(`[${modelId.slice(0,8)}] ✅ No position change detected, skipping sync`);
      return;
    }

    console.log(
      `[${modelId.slice(0,8)}] � Position prop REALLY changed!`,
      'from:', parentPrev?.map(v => v.toFixed(3)),
      'to:', nextFromProps.map(v => v.toFixed(3)),
      'diff:', parentPrev ? nextFromProps.map((v, i) => (v - parentPrev[i]).toFixed(4)) : 'n/a'
    );

    lastParentPropPositionRef.current = [...nextFromProps] as [number, number, number];

    // Sync localPosition state
    const lastApplied = lastPropPositionForLocalRef.current;
    if (!lastApplied || !arePositionsClose(lastApplied, nextFromProps)) {
      console.log(`[${modelId.slice(0,8)}] 📥 Syncing localPosition:`, nextFromProps);
      commitLocalPosition(nextFromProps);
    }

    // Sync ref.current.position (Three.js object)
    if (ref.current) {
      const currentRefPos: [number, number, number] = [
        ref.current.position.x,
        ref.current.position.y,
        ref.current.position.z
      ];
      if (!arePositionsClose(currentRefPos, nextFromProps)) {
        console.log(`[${modelId.slice(0,8)}] 🔄 Syncing ref.position:`, 
          'from:', currentRefPos, 'to:', nextFromProps);
        commitRefPosition(nextFromProps);
      } else {
        console.log(`[${modelId.slice(0,8)}] ⏭️ Ref already at target, skip sync`);
      }
    } else {
      // Ref not ready yet, defer
      pendingRefSyncRef.current = [...nextFromProps] as [number, number, number];
    }
  }, [stablePosition, isDragging, isPinching, isRotating, modelId, arePositionsClose]);
  
  
  // SYNC #1: layoutEpoch changed → force sync on structure change (add/remove models)
  useEffect(() => {
    if (layoutEpoch == null) return;
    
    // 🔒 Block position updates during selection changes
    if (isSelectingRef.current) {
      console.log(`[${modelId.slice(0,8)}] ⏸️ LayoutEpoch sync skipped - selection changing`);
      return;
    }
    
    const nextFromProps: [number, number, number] = [stablePosition[0], stablePosition[1], stablePosition[2]];
    lastParentPropPositionRef.current = [...nextFromProps] as [number, number, number];

    if (isDragging || isPinching || isRotating) {
      pendingRefSyncRef.current = [...nextFromProps] as [number, number, number];
      return;
    }

    if (!ref.current) {
      pendingRefSyncRef.current = [...nextFromProps] as [number, number, number];
      return;
    }

    // ✅ Check if ref position already matches prop position
    const currentRefPos: [number, number, number] = [
      ref.current.position.x,
      ref.current.position.y,
      ref.current.position.z
    ];
    if (arePositionsClose(currentRefPos, nextFromProps)) {
      console.log(`[${modelId.slice(0,8)}] ⏭️ LayoutEpoch sync skipped (already at target)`);
      return;
    }

    const beforeSync = ref.current.position.toArray();
    commitRefPosition(nextFromProps);
    console.log(`[${modelId.slice(0,8)}] 🔄 LayoutEpoch sync (${layoutEpoch}):`,
      'from:', beforeSync, 'to:', nextFromProps);
    
  
  }, [layoutEpoch, stablePosition, modelId, arePositionsClose]);

  
  useEffect(() => {
    if (pivotRef.current && !isPinching && !isRotating) {
      pivotRef.current.rotation.set(localRotation[0], localRotation[1], localRotation[2]);
    }
  }, [localRotation, isPinching, isRotating]);

  
  useEffect(() => {
    if (isDragging || isPinching || isRotating) return;

    if (pendingLocalSyncRef.current) {
      const next = pendingLocalSyncRef.current;
      pendingLocalSyncRef.current = null;
      console.log(`[${modelId.slice(0,8)}] 📥 Applying pending localPosition:`, next);
      commitLocalPosition(next);
    }

    if (pendingRefSyncRef.current && ref.current) {
      const next = pendingRefSyncRef.current;
      pendingRefSyncRef.current = null;
      const before = ref.current.position.toArray();
      commitRefPosition(next);
      console.log(`[${modelId.slice(0,8)}] 🔄 Applying pending ref sync:`, 'from:', before, 'to:', next);
    }
  }, [isDragging, isPinching, isRotating, modelId]);

  
  useEffect(() => {
    console.log(`[${modelId.slice(0,8)}] 🎯 SELECTED CHANGED:`, selected, 
      '\n  ref.pos:', ref.current?.position.toArray(), 
      '\n  localPos:', localPosition, 
      '\n  prop pos:', stablePosition);
    
    // 🔒 CRITICAL: Block ALL position updates during selection change
    isSelectingRef.current = true;
    
    
    dragEnableAtRef.current = Date.now() + 200;
    
    if (selected) {
      deleteEnableAtRef.current = Date.now() + 600; 
    } else {
      deleteEnableAtRef.current = 0;
    }
    
    
    dragStartRef.current = null;
    pendingDragRef.current = null;
    dragActivatedRef.current = false;
    lastDragPlaneRef.current = null;
    setIsDragging(false);
    setIsRotating(false);
    
    // Unblock position updates after a short delay
    const timer = setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
    
    return () => {
      clearTimeout(timer);
      isSelectingRef.current = false;
    };
  }, [selected]);

  
  useEffect(() => {
    if (pivotRef.current && !isPinching) {
      pivotRef.current.scale.set(localScale[0], localScale[1], localScale[2]);
    }
  }, [localScale, isPinching]);

  

  
  
  const getWorldPointOnPlane = (
    clientX: number,
    clientY: number,
    planeNormal: THREE.Vector3,
    planeConstant: number
  ): THREE.Vector3 | null => {
    const rect = canvasRectRef.current ?? gl.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera({ x, y } as any, camera);
    dragPlaneRef.current.set(planeNormal, planeConstant);
    const out = tmpVec3Ref.current;
    const hit = raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, out);
    return hit ? out.clone() : null;
  };

  const handlePointerDown = (e: any) => {
    
    try { e.stopPropagation(); } catch {}
    
    
    
    if (activeGestureId && activeGestureId !== modelId) {
      return;
    }
    
    if (isPinching || isRotating) {
      return;
    }
    
    if (selected && ref.current && Date.now() >= deleteEnableAtRef.current) {
      try {
        
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
          
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
          const scaleFactor = pivotRef.current ? pivotRef.current.scale.x : Math.max(localScale[0], localScale[1], localScale[2]);
          const worldRadius = deleteBtnRadius * scaleFactor;
          const edgeWorld = delWorld.clone().add(camRight.multiplyScalar(worldRadius));
          const edgeNdc = edgeWorld.clone().project(camera);
          const edgePx = ((edgeNdc.x + 1) / 2) * rect.width + rect.left;
          const edgePy = ((-edgeNdc.y + 1) / 2) * rect.height + rect.top;
          const pxRadius = Math.hypot(edgePx - px, edgePy - py);
          const thresholdPx = pxRadius * 0.85; 
          if (distPx <= thresholdPx) {
            
            deletePressRef.current = { downX: e.clientX, downY: e.clientY, time: Date.now(), wasInside: true };
            
            return;
          }
        }
      } catch {}
    }

    
    dragStartRef.current = null;
    pendingDragRef.current = null;
    dragActivatedRef.current = false;
    dragEndingRef.current = false; 
    
    console.log(`[${modelId.slice(0,8)}] PointerDown - ref.pos:`, ref.current?.position.toArray(), 'local:', localPosition);

    
    if (!selected) {
      console.log(`[${modelId.slice(0,8)}] Not selected, only selecting (no drag yet)`);
      onSelect();
      // ✅ Camera focus disabled - no auto-shift when selecting model
      // try {
      //   if (pivotRef.current) {
      //     const wc = new THREE.Vector3();
      //     pivotRef.current.getWorldPosition(wc);
      //     onFocusCenter?.([wc.x, wc.y, wc.z]);
      //   }
      // } catch {}
      
      return;
    }
    
    if (controlsEnabled) {
      if (onGestureStart && !onGestureStart(modelId, 'rotate')) return;
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
      
      return;
    }

    
    
    if (Date.now() < dragEnableAtRef.current) {
      console.log(`[${modelId.slice(0,8)}] Drag blocked by grace period`);
      return;
    }
    
    try { e.stopPropagation(); } catch {}
  if (onGestureStart && !onGestureStart(modelId, 'drag')) return;
    setIsDragging(true);
    
    if (typeof e.pointerId === 'number') activeDragPointerIdRef.current = e.pointerId;
    if (e.target && typeof e.target.setPointerCapture === 'function' && e.pointerId != null) {
      try { e.target.setPointerCapture(e.pointerId); } catch {}
    }

    
  const clientX = e.clientX;
  const clientY = e.clientY;

    
    
  
  try { canvasRectRef.current = gl.domElement.getBoundingClientRect(); } catch { canvasRectRef.current = null; }

  
    
    
    const objPos = ref.current ? ref.current.position.clone() : new THREE.Vector3(localPosition[0], localPosition[1], localPosition[2]);
    console.log(`[${modelId.slice(0,8)}] Starting direct drag - objPos:`, objPos.toArray(), 'ref exists:', !!ref.current);
    
    const prevDragPlane = lastDragPlaneRef.current;
    let normal = new THREE.Vector3(0, 1, 0);
    
    let planeConst = -normal.dot(objPos);
    let worldDown = getWorldPointOnPlane(clientX, clientY, normal, planeConst);
    if (!worldDown && prevDragPlane) {
      normal = prevDragPlane.normal.clone();
      planeConst = -normal.dot(objPos);
      worldDown = getWorldPointOnPlane(clientX, clientY, normal, planeConst);
    }
    if (!worldDown) {
      const fallback = new THREE.Vector3();
      camera.getWorldDirection(fallback);
      planeConst = -fallback.dot(objPos);
      worldDown = getWorldPointOnPlane(clientX, clientY, fallback, planeConst);
      if (worldDown) normal = fallback.clone();
    }
    
    const offset = worldDown ? objPos.clone().sub(worldDown) : new THREE.Vector3(0, 0, 0);
    
    dragStartRef.current = {
      modelId: modelId,
      x: clientX,
      y: clientY,
      objStart: objPos.clone(),
      planeNormal: normal.clone(),
      planeConstant: planeConst,
      offset: offset.clone()
    };
    lastDragPlaneRef.current = {
      normal: normal.clone(),
      point: objPos.clone(),
    };
    console.log(`[${modelId.slice(0,8)}] Direct drag created, offset:`, offset.toArray().map(v => v.toFixed(2)));
    dragActivatedRef.current = false;
    
    lastPointerPosRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = Date.now();
  };

  const handlePointerMove = (e: any) => {
    
    try { e.stopPropagation(); } catch {}
    
    
    
    if (isRotating && pivotRef.current) {
      const clientX = e.touches ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      const last = lastPointerPosRef.current;
      if (last) {
        const dx = clientX - last.x;
        const dy = clientY - last.y;
        const ROT_PER_PX_X = 0.01; 
        const ROT_PER_PX_Y = 0.01; 
        
        rotateTargetRef.current.y += dx * ROT_PER_PX_Y;
        rotateTargetRef.current.x += -dy * ROT_PER_PX_X; 
        
        const maxPitch = Math.PI / 3; 
        rotateTargetRef.current.x = Math.max(-maxPitch, Math.min(maxPitch, rotateTargetRef.current.x));
        
      }
      lastPointerPosRef.current = { x: clientX, y: clientY };
      return;
    }
    
    if (isPinching && e.pointerId != null) {
      const clientX = e.touches ? e.touches[0]?.clientX ?? e.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY ?? e.clientY : e.clientY;
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: clientX, y: clientY });
      }
      if (pointersRef.current.size >= 2 && pinchRef.current) {
        
        const arr = Array.from(pointersRef.current.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v);
        const dx = arr[1].x - arr[0].x;
        const dy = arr[1].y - arr[0].y;
        const newDist = Math.hypot(dx, dy);
        const newAngle = Math.atan2(dy, dx);
        
  const prev = pinchRef.current.prevDistance ?? newDist;
  pinchRef.current.prevDistance = pinchRef.current.lastDistance ?? newDist;
  pinchRef.current.prevAngle = pinchRef.current.lastAngle ?? newAngle;
  pinchRef.current.lastDistance = newDist;
  pinchRef.current.lastAngle = newAngle;
        
        if (ref.current) {
          const SENS = 8.4;
          const dead = 0.00025;
          const minS = 0.1;
          const maxS = 3;
          const pr = pinchRef.current;
          
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
            
            let d = (pr.lastAngle ?? newAngle) - (pr.prevAngle ?? newAngle);
            
            const PI2 = Math.PI * 2;
            while (d > Math.PI) d -= PI2;
            while (d < -Math.PI) d += PI2;
            const ROT_SENS = 2.2;
            pivotRef.current.rotateOnAxis(new THREE.Vector3(0, 1, 0), d * ROT_SENS);
            pr.targetRotY = pivotRef.current.rotation.y;
          }
        }
        
      }
      return;
    }
  if (isPinching || controlsEnabled) return; 
    
    if (activeGestureId && activeGestureId !== modelId) return;
    
    if (!isDragging && !pendingDragRef.current) return;

    
    if (activeDragPointerIdRef.current != null && typeof e.pointerId === 'number' && e.pointerId !== activeDragPointerIdRef.current) {
      return;
    }

    
    let clientX = e.clientX;
    let clientY = e.clientY;
    try {
      const ces = (e as PointerEvent).getCoalescedEvents?.();
      if (ces && ces.length) {
        const last = ces[ces.length - 1];
        if (typeof last.clientX === 'number' && typeof last.clientY === 'number') {
          clientX = last.clientX;
          clientY = last.clientY;
        }
      }
    } catch {}

    lastPointerPosRef.current = { x: clientX, y: clientY };
    lastMoveTimeRef.current = Date.now();

    
    if (!isDragging && pendingDragRef.current) {
      
      if (pendingDragRef.current.modelId !== modelId) {
        console.warn(`[Model ${modelId}] Ignoring pending drag from different model ${pendingDragRef.current.modelId}`);
        pendingDragRef.current = null;
        return;
      }
      const dx0 = clientX - pendingDragRef.current.x;
      const dy0 = clientY - pendingDragRef.current.y;
      if (Math.hypot(dx0, dy0) >= DRAG_THRESHOLD_PX) {
        if (onGestureStart && !onGestureStart(modelId, 'drag')) return;
        setIsDragging(true);
        dragStartRef.current = { ...pendingDragRef.current } as any;
        pendingDragRef.current = null;
        if (dragStartRef.current) {
          lastDragPlaneRef.current = {
            normal: dragStartRef.current.planeNormal.clone(),
            point: dragStartRef.current.objStart.clone(),
          };
        }
        if (typeof e.pointerId === 'number') activeDragPointerIdRef.current = e.pointerId;
      } else {
        return;
      }
    }

    
    if (ref.current && dragStartRef.current) {
      
      if (dragStartRef.current.modelId !== modelId) {
        console.warn(`[Model ${modelId}] Ignoring drag from different model ${dragStartRef.current.modelId}`);
        return;
      }
      
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      const dist = Math.hypot(dx, dy);
      if (!dragActivatedRef.current && dist < DRAG_THRESHOLD_PX) {
        return;
      }
      dragActivatedRef.current = true;
      const world = getWorldPointOnPlane(
        clientX,
        clientY,
        dragStartRef.current.planeNormal,
        dragStartRef.current.planeConstant
      );
      if (world) {
        const pos = world.clone().add(dragStartRef.current.offset);
        ref.current.position.set(pos.x, pos.y, pos.z);
        try { invalidate(); } catch {}
      }
    }
  };

  const handlePointerUp = (e?: any) => {
    
    if (deletePressRef.current && e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      const press = deletePressRef.current;
      deletePressRef.current = null;
      const moved = Math.hypot(e.clientX - press.downX, e.clientY - press.downY);
      const quick = Date.now() - press.time < 500;
      if (press.wasInside && moved <= 10 && quick && selected && ref.current && Date.now() >= deleteEnableAtRef.current) {
        
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
          const scaleFactor = pivotRef.current ? pivotRef.current.scale.x : Math.max(localScale[0], localScale[1], localScale[2]);
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
    
    if (isRotating) {
      if (pivotRef.current) {
        const ry = pivotRef.current.rotation.y;
        const newRotation: [number, number, number] = [localRotation[0], ry, localRotation[2]];
        setLocalRotation(newRotation);
        onUpdate({ rotation: newRotation });
      }
      setIsRotating(false);
      try { onGestureEnd?.(modelId, 'rotate'); } catch {}
      lastGestureEndTimeRef.current = Date.now();
      lastPointerPosRef.current = null;
      return;
    }
    
    if (e && e.pointerId != null) {
      pointersRef.current.delete(e.pointerId);
    }
  
    if (isPinching) {
      if (pivotRef.current) {
        const s = pivotRef.current.scale.x;
        const ry = pivotRef.current.rotation.y;
        const newScale: [number, number, number] = [s, s, s];
        const newRotation: [number, number, number] = [localRotation[0], ry, localRotation[2]];
        setLocalScale(newScale);
        setLocalRotation(newRotation);
        onUpdate({ scale: newScale, rotation: newRotation });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
      try { onGestureEnd?.(modelId, 'pinch'); } catch {}
      lastGestureEndTimeRef.current = Date.now();
      return;
    }
    
    if (isDragging) {
      
      if (dragEndingRef.current) {
        console.log(`[${modelId.slice(0,8)}] Ignoring duplicate pointerUp`);
        return;
      }
      
      const isSamePointer = (e && typeof e.pointerId === 'number')
        ? (activeDragPointerIdRef.current == null || e.pointerId === activeDragPointerIdRef.current)
        : true;
      if (isSamePointer) {
        
        dragEndingRef.current = true;
        
        const endPlane = dragStartRef.current
          ? {
              normal: dragStartRef.current.planeNormal.clone(),
              point: (ref.current ? ref.current.position.clone() : dragStartRef.current.objStart.clone()),
            }
          : null;
        
        setIsDragging(false);
        try { onGestureEnd?.(modelId, 'drag'); } catch {}
        lastGestureEndTimeRef.current = Date.now();
        activeDragPointerIdRef.current = null;
        dragStartRef.current = null;
        dragActivatedRef.current = false;
        lastPointerPosRef.current = null;
        
        
        if (ref.current) {
          const finalPos = ref.current.position;
          const newPosition: [number, number, number] = [finalPos.x, finalPos.y, finalPos.z];
          console.log(`[${modelId.slice(0,8)}] Drag ended, saving position:`, newPosition);
          commitLocalPosition(newPosition);
          onUpdate({ position: newPosition });
          lastPropPositionForRefSyncRef.current = [...newPosition] as [number, number, number];
          if (endPlane) {
            lastDragPlaneRef.current = endPlane;
          } else {
            lastDragPlaneRef.current = {
              normal: new THREE.Vector3(0, 1, 0),
              point: finalPos.clone(),
            };
          }
        }
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        canvasRectRef.current = null;
        
        
        setTimeout(() => {
          dragEndingRef.current = false;
        }, 100);
      }
    }
    
    pendingDragRef.current = null;
    dragActivatedRef.current = false;
  };

  
  useFrame((_, delta) => {
    let needsInvalidate = false;
    
    
    
    
    

    
    if (isPinching && pinchRef.current && ref.current) {
      const pr = pinchRef.current;
      
      if (Number.isFinite(pr.targetScale) && Number.isFinite(pr.targetRotY)) {
        if (pivotRef.current) {
          pivotRef.current.scale.setScalar(pr.targetScale);
          
        }
      } else {
        
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

      needsInvalidate = true;
    }

    
    if (isRotating && pivotRef.current) {
      if (activeGestureId && activeGestureId !== modelId) {
        
      } else {
      
      const k = 12; 
      const s = 1 - Math.exp(-k * Math.max(0.001, delta));
      
      rotateCurrentRef.current.x += (rotateTargetRef.current.x - rotateCurrentRef.current.x) * s;
      rotateCurrentRef.current.y += (rotateTargetRef.current.y - rotateCurrentRef.current.y) * s;
      
      pivotRef.current.rotation.set(rotateCurrentRef.current.x, rotateCurrentRef.current.y, 0);
      needsInvalidate = true;
      }
    }
    if (needsInvalidate) invalidate();
  });

  
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

  
  useEffect(() => {
    const onAnyUp = () => {
      if (isDragging) {
        handlePointerUp();
      } else if (isRotating) {
        handlePointerUp();
      } else if (isPinching) {
        
        if (pivotRef.current) {
          const s = pivotRef.current.scale.x;
          const ry = pivotRef.current.rotation.y;
          const newScale: [number, number, number] = [s, s, s];
          const newRotation: [number, number, number] = [localRotation[0], ry, localRotation[2]];
          setLocalScale(newScale);
          setLocalRotation(newRotation);
          onUpdate({ scale: newScale, rotation: newRotation });
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

  
  useEffect(() => {
    if (layoutEpoch == null) return;
    
    if (isDragging) {
      handlePointerUp();
    }
    if (isPinching) {
      if (pivotRef.current) {
        const s = pivotRef.current.scale.x;
        const ry = pivotRef.current.rotation.y;
        const newScale: [number, number, number] = [s, s, s];
        const newRotation: [number, number, number] = [localRotation[0], ry, localRotation[2]];
        setLocalScale(newScale);
        setLocalRotation(newRotation);
        onUpdate({ scale: newScale, rotation: newRotation });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
    }
    pointersRef.current.clear();
  }, [layoutEpoch]);

  
  useEffect(() => {
    if (!controlsEnabled) return;
    if (isDragging) {
      handlePointerUp();
    }
    if (isPinching) {
      
      if (pivotRef.current) {
        const s = pivotRef.current.scale.x;
        const ry = pivotRef.current.rotation.y;
        const newScale: [number, number, number] = [s, s, s];
        const newRotation: [number, number, number] = [localRotation[0], ry, localRotation[2]];
        setLocalScale(newScale);
        setLocalRotation(newRotation);
        onUpdate({ scale: newScale, rotation: newRotation });
      }
      setIsPinching(false);
      pinchRef.current = null;
      try { onPinchActiveChange?.(false); } catch {}
    }
  }, [controlsEnabled]);

  
  useEffect(() => {
    
    return;
  }, [selected, scale, onUpdate, gl, controlsEnabled]);

  
  useEffect(() => {
    
    if (!isDragging) return;

    const canvas = gl.domElement;

    const handleGlobalMove = (e: PointerEvent) => {
      
      if (activeGestureId && activeGestureId !== modelId) return;
      if (!dragStartRef.current) return;
      
      if (activeDragPointerIdRef.current != null && typeof (e as any).pointerId === 'number') {
        if ((e as any).pointerId !== activeDragPointerIdRef.current) return;
      }

      
      let clientX = e.clientX;
      let clientY = e.clientY;
      try {
        const ces = e.getCoalescedEvents?.();
        if (ces && ces.length) {
          const last = ces[ces.length - 1];
          if (typeof last.clientX === 'number' && typeof last.clientY === 'number') {
            clientX = last.clientX;
            clientY = last.clientY;
          }
        }
      } catch {}

      lastPointerPosRef.current = { x: clientX, y: clientY };
      lastMoveTimeRef.current = Date.now();

      
      if (ref.current && dragStartRef.current) {
        
        if (dragStartRef.current.modelId !== modelId) {
          console.warn(`[Global Move Model ${modelId}] Ignoring drag from different model ${dragStartRef.current.modelId}`);
          return;
        }
        const dx = clientX - dragStartRef.current.x;
        const dy = clientY - dragStartRef.current.y;
        const dist = Math.hypot(dx, dy);
        if (!dragActivatedRef.current && dist < DRAG_THRESHOLD_PX) {
          return;
        }
        dragActivatedRef.current = true;
        const world = getWorldPointOnPlane(
          clientX,
          clientY,
          dragStartRef.current.planeNormal,
          dragStartRef.current.planeConstant
        );
        if (world) {
          const pos = world.clone().add(dragStartRef.current.offset);
          ref.current.position.set(pos.x, pos.y, pos.z);
          try { invalidate(); } catch {}
        }
      }
    };

    
    const onRaw = (e: Event) => handleGlobalMove(e as PointerEvent);
    canvas.addEventListener('pointermove', handleGlobalMove as any, { passive: true });
    (canvas as any).addEventListener?.('pointerrawupdate', onRaw, { passive: true });
    document.addEventListener('pointermove', handleGlobalMove as any, { passive: true });

    return () => {
      canvas.removeEventListener('pointermove', handleGlobalMove as any);
      (canvas as any).removeEventListener?.('pointerrawupdate', onRaw as any);
      document.removeEventListener('pointermove', handleGlobalMove as any);
    };
  }, [isDragging, onUpdate, gl, modelId, activeGestureId]);

  

  
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

  
  useEffect(() => {
    if (!activeGestureId) return;
    if (activeGestureId !== modelId) {
      if (isDragging || isRotating || isPinching) {
        
        try { handlePointerUp(); } catch {}
      }
    }
  }, [activeGestureId]);

  
  
  const deleteBtnPosition: [number, number, number] = [
    bboxSizeRef.current.x / 2 + Math.max(0.03, Math.min(0.12, bboxSizeRef.current.x * 0.15)),
    bboxSizeRef.current.y / 2 + Math.max(0.03, Math.min(0.15, bboxSizeRef.current.y * 0.1)),
    0
  ];
  const deleteBtnRadius = Math.max(0.05, Math.min(0.14, Math.max(bboxSizeRef.current.x, bboxSizeRef.current.y) * 0.12));

  
  

  return (
    <group
      ref={ref}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      dispose={null}
    >
      {}
      <group ref={pivotRef}>
        {}
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
            <meshBasicMaterial color="#000000" transparent opacity={0} depthWrite={false} colorWrite={false} />
          </mesh>
        )}
        {}
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
        {}
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


const MemoModel = React.memo(Model, (prevProps, nextProps) => {
  
  if (prevProps.modelId !== nextProps.modelId) return false;
  if (prevProps.selected !== nextProps.selected) return false;
  if (prevProps.controlsEnabled !== nextProps.controlsEnabled) return false;
  
  
  
  if (prevProps.activeGestureId !== nextProps.activeGestureId) return false;
  if (prevProps.url !== nextProps.url) return false;
  
  
  const posChanged = prevProps.position.some((v, i) => Math.abs(v - nextProps.position[i]) > 0.0001);
  const rotChanged = prevProps.rotation.some((v, i) => Math.abs(v - nextProps.rotation[i]) > 0.0001);
  const scaleChanged = prevProps.scale.some((v, i) => Math.abs(v - nextProps.scale[i]) > 0.0001);
  
  
  return !posChanged && !rotChanged && !scaleChanged;
});


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

const Overlay3D: React.FC<Overlay3DProps> = ({ mode, layout, onLayoutChange }) => {
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [models, setModels] = useState<ModelData[]>(layout);
  const [layoutEpoch, setLayoutEpoch] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeGestureId, setActiveGestureId] = useState<string | null>(null);
  const [cameraControlEnabled, setCameraControlEnabled] = useState(false);
  const controlsRef = useRef<any>(null);
  const lastCentersRef = useRef<Map<string, [number, number, number]>>(new Map());
  const [pinchingIds, setPinchingIds] = useState<Set<string>>(new Set());
  const lastLayoutRef = useRef<ModelData[] | null>(null);
  const pendingNotifyRef = useRef<ModelData[] | null>(null);
  const hasMountedRef = useRef(false);
  const layoutStructureRef = useRef<string>("");

  const computeStructureSignature = React.useCallback((items: ModelData[]) => {
    return items.map((m) => m.id).sort().join("|");
  }, []);

  const updateModels = React.useCallback((updater: (prev: ModelData[]) => ModelData[]) => {
    let computed: ModelData[] = [];
    setModels((prev) => {
      const next = updater(prev);
      computed = next;
      pendingNotifyRef.current = next === prev ? null : next;
      return next;
    });
    return computed;
  }, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      pendingNotifyRef.current = null;
      return;
    }
    if (pendingNotifyRef.current) {
      onLayoutChange(pendingNotifyRef.current);
      pendingNotifyRef.current = null;
    }
  }, [models, onLayoutChange]);
  
  

  useEffect(() => {
    if (lastLayoutRef.current === layout) return;
    lastLayoutRef.current = layout;
    setModels(layout);

    const structureSignature = Array.isArray(layout)
      ? computeStructureSignature(layout)
      : "";
    const prevSignature = layoutStructureRef.current;
    layoutStructureRef.current = structureSignature;
    if (prevSignature !== structureSignature) {
      setLayoutEpoch((e) => e + 1);
    }

    setSelectedId((prev) => {
      if (!prev) return null;
      return layout.some((m) => m.id === prev) ? prev : null;
    });
  }, [layout, computeStructureSignature]);

  // 🔒 Prevent camera/controls changes when selection changes
  useEffect(() => {
    if (!controlsRef.current) return;
    
    // Lock controls target when selection changes
    console.log(`[Overlay3D] Selection changed to: ${selectedId}`);
    
    // Prevent OrbitControls from auto-adjusting
    if (controlsRef.current.target) {
      const currentTarget = controlsRef.current.target.clone();
      
      // Reset target after a microtask to prevent auto-adjustment
      setTimeout(() => {
        if (controlsRef.current?.target) {
          controlsRef.current.target.copy(currentTarget);
          try { controlsRef.current.update(); } catch {}
        }
      }, 0);
    }
  }, [selectedId]);

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
            
            if (videoEl.srcObject) {
              const oldStream = videoEl.srcObject as MediaStream;
              oldStream.getTracks().forEach(track => track.stop());
            }
            
            videoEl.srcObject = stream;
            
            
            await new Promise<void>((resolve) => {
              videoEl.onloadedmetadata = () => {
                if (isMounted) {
                  videoEl.play().catch(() => {
                    
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
    const item: ModelData = {
      id,
      url,
      position: [Math.random() - 0.5, 0, Math.random() - 0.5],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
    const next = updateModels((prev) => [...prev, item]);
    layoutStructureRef.current = computeStructureSignature(next);
    setLayoutEpoch((e) => e + 1);
    setSelectedId(id);
  };

  const handleUpdateModel = (id: string, data: Partial<Pick<ModelData, "position" | "rotation" | "scale">>) => {
    console.log(`[handleUpdateModel] Called for model: ${id.slice(0,8)}`, 'data:', data);
    updateModels((prev) => {
      console.log(`[handleUpdateModel] Current models:`, prev.map(m => `${m.id.slice(0,8)}: pos=[${m.position.map(v => v.toFixed(2)).join(',')}]`).join(' | '));
      
      let changed = false;
      const next = prev.map((obj) => {
        if (obj.id !== id) return obj;
        
        console.log(`[handleUpdateModel] Found target model ${obj.id.slice(0,8)}, current pos:`, obj.position);
        
        // ✅ Check if data actually changed before creating new object
        const posChanged = data.position && obj.position.some((v, i) => Math.abs(v - data.position![i]) > 0.0001);
        const rotChanged = data.rotation && obj.rotation.some((v, i) => Math.abs(v - data.rotation![i]) > 0.0001);
        const scaleChanged = data.scale && obj.scale.some((v, i) => Math.abs(v - data.scale![i]) > 0.0001);
        
        if (!posChanged && !rotChanged && !scaleChanged) {
          console.log(`[${id.slice(0,8)}] ⏭️ Update skipped (no real change)`);
          return obj; // Return same reference if nothing changed
        }
        
        changed = true;
        console.log(`[${id.slice(0,8)}] ✏️ Updating model from:`, obj.position, 'to:', data.position);
        return { ...obj, ...data };
      });
      
      console.log(`[handleUpdateModel] Result models:`, next.map(m => `${m.id.slice(0,8)}: pos=[${m.position.map(v => v.toFixed(2)).join(',')}]`).join(' | '));
      return changed ? next : prev; // Return same array if nothing changed
    });
  };

  const handleRemoveModel = (id: string) => {
    const next = updateModels((prev) => prev.filter((obj) => obj.id !== id));
    layoutStructureRef.current = computeStructureSignature(next);
    setLayoutEpoch((e) => e + 1);
    if (selectedId === id) setSelectedId(null);
  };

  const handleSaveLayout = () => {
    localStorage.setItem("room-layout", JSON.stringify(models));
    alert("Room layout saved!");
  };
  const handleLoadLayout = () => {
    const raw = localStorage.getItem("room-layout");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const withIds = Array.isArray(parsed)
        ? parsed.map((o) => (o && o.id ? o : { ...o, id: (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`) }))
        : [];
      pendingNotifyRef.current = withIds;
      setModels(withIds);
      layoutStructureRef.current = computeStructureSignature(withIds);
      setLayoutEpoch((e) => e + 1);
      setSelectedId(null);
    } catch {
      pendingNotifyRef.current = [];
      setModels([]);
      layoutStructureRef.current = "";
    }
  };

  const handleScreenshot = async () => {
    console.log("=== SCREENSHOT START ===");
    
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const videoEl = document.getElementById("video-bg") as HTMLVideoElement;
    
    if (!canvas) {
      alert("Canvas not found!");
      return;
    }

    
    const width = canvas.width;
    const height = canvas.height;
    
    console.log("Canvas size:", { width, height });
    console.log("Video element:", videoEl);

    
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const ctx = tempCanvas.getContext("2d");
    
    if (!ctx) {
      alert("Cannot create canvas context!");
      return;
    }

    try {
      
  
  try { (window as any).__r3fInvalidate?.(); } catch {}
      await new Promise(requestAnimationFrame);

      
      if (mode === "mobile" && videoEl && videoEl.videoWidth > 0) {
        console.log("Drawing video:", {
          videoWidth: videoEl.videoWidth,
          videoHeight: videoEl.videoHeight
        });
        ctx.drawImage(videoEl, 0, 0, width, height);
      } else {
        
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
      }

      
      console.log("Drawing Three.js canvas");
      ctx.drawImage(canvas, 0, 0, width, height);

      
      const dataURL = tempCanvas.toDataURL("image/png");
      console.log("Image created, length:", dataURL.length);
      
      if (dataURL.length < 1000) {
        alert("Image seems empty! Length: " + dataURL.length);
        return;
      }

      
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
        gl={{ alpha: true, antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false, stencil: false, precision: 'mediump' as any }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          
          gl.toneMapping = THREE.NoToneMapping;
          
          try { gl.domElement.style.touchAction = 'none'; } catch {}
        }}
      >
  {}
        {}
        {}
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
          <PreloadModels urls={models.map(m => m.url)} />
          {models.map((m) => (
            <MemoModel
              key={m.id}
              modelId={m.id}
              url={m.url}
              position={m.position}
              rotation={m.rotation}
              scale={m.scale}
              mode={mode}
              controlsEnabled={cameraControlEnabled && pinchingIds.size === 0}
              selected={selectedId === m.id}
              layoutEpoch={layoutEpoch}
              onUpdate={(data: any) => handleUpdateModel(m.id, data)}
              onSelect={() => setSelectedId(m.id)}
              onRemove={() => handleRemoveModel(m.id)}
              activeGestureId={activeGestureId}
              onGestureStart={(id, type) => {
                
                let allow = false;
                setActiveGestureId((prev) => {
                  if (prev == null || prev === id) {
                    allow = true;
                    return id;
                  }
                  
                  return prev;
                });
                return allow;
              }}
              onGestureEnd={(id, type) => {
                setActiveGestureId((prev) => (prev === id ? null : prev));
              }}
              onPinchActiveChange={(active: boolean) => {
                setPinchingIds((prev) => {
                  const next = new Set(prev);
                  if (active) next.add(m.id);
                  else next.delete(m.id);
                  return next;
                });
              }}
              onFocusCenter={undefined}
            />
          ))}
          <Preload all />
        </Suspense>
      </Canvas>

      {}

      <div className="toolbar">
        <ModelGallery onAdd={handleAddModel} />
        <Button 
          variant={cameraControlEnabled ? "contained" : "outlined"}
          color="warning"
          onClick={() => {
            const next = !cameraControlEnabled;
            setCameraControlEnabled(next);
            
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
        {}
        {}
        <Button variant="contained" onClick={handleScreenshot}>SAVE IMAGE</Button>
        <Button variant="contained" onClick={handleSaveLayout}>SAVE LAYOUT</Button>
        <Button variant="contained" onClick={handleLoadLayout}>LOAD LAYOUT</Button>
      </div>
  {}
  <FpsHud enabled />
    </div>
  );
};

export default Overlay3D;


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


const FpsHud: React.FC<{ enabled?: boolean }> = ({ enabled = true }) => {
  const [fps, setFps] = React.useState<number>(0);
  useEffect(() => {
    if (!enabled) return;
    let raf: number;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      acc += dt;
      frames += 1;
      if (acc >= 500) { 
        setFps(Math.round((frames * 1000) / acc));
        acc = 0;
        frames = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  if (!enabled) return null;
  return (
    <div className="fpsHud">FPS: {fps}</div>
  );
};