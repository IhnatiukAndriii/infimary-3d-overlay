import React, { useRef, useEffect, useState, useCallback } from "react";
import { fabric } from "fabric";
import ObjectToolbar from "./ObjectToolbar";
import PreviewModal from "./PreviewModal";
import styles from "./CameraOverlay.module.css";
import { SvgAsset, SVG_LIBRARY_STORAGE_KEY } from "../types/svg";
import { CapturedPhoto, GALLERY_STORAGE_KEY } from "../types/gallery";
import { useTouchGestures } from "../hooks/useTouchGestures";

type CameraOverlayProps = {
  onOpenGallery?: () => void;
};

const CameraOverlay: React.FC<CameraOverlayProps> = ({ onOpenGallery }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const cancelPlayRef = useRef<boolean>(false);
  
  const [videoReady, setVideoReady] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [restartTick, setRestartTick] = useState<number>(0);
  const [devices, setDevices] = useState<Array<{ label: string; deviceId: string }>>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [svgLibrary, setSvgLibrary] = useState<SvgAsset[]>([]);

  // Enable touch gestures for mobile
  useTouchGestures({ canvas: fabricRef.current, enabled: true });

  const updateCanvasSize = useCallback(() => {
    const canvasEl = fabricCanvasRef.current;
    const fabricCanvas = fabricRef.current;
    if (!canvasEl || !fabricCanvas) return;

    const host = canvasEl.parentElement;
    const bounds = host?.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(bounds?.width ?? window.innerWidth));
    const nextHeight = Math.max(1, Math.round(bounds?.height ?? window.innerHeight));

    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;

    const applySize = (element?: HTMLCanvasElement | HTMLDivElement | null) => {
      if (!element) return;
      element.style.width = `${nextWidth}px`;
      element.style.height = `${nextHeight}px`;
      if (element instanceof HTMLCanvasElement) {
        element.width = nextWidth;
        element.height = nextHeight;
      }
    };

    const internals = fabricCanvas as unknown as {
      lowerCanvasEl?: HTMLCanvasElement;
      upperCanvasEl?: HTMLCanvasElement;
      wrapperEl?: HTMLDivElement;
    };

    applySize(canvasEl);
    const lowerEl = internals.lowerCanvasEl ?? fabricCanvas.getElement();
    const upperEl = internals.upperCanvasEl ?? undefined;
    applySize(lowerEl);
    applySize(upperEl);
    applySize(fabricCanvas.getSelectionElement());
    const wrapperEl = internals.wrapperEl ?? undefined;
    applySize(wrapperEl);
    // Force absolute positioning to fully cover host container
    if (wrapperEl) {
      wrapperEl.style.position = 'absolute';
      wrapperEl.style.top = '0';
      wrapperEl.style.left = '0';
      wrapperEl.style.right = '0';
      wrapperEl.style.bottom = '0';
      wrapperEl.style.zIndex = '2';
    }
    if (lowerEl) {
      lowerEl.style.position = 'absolute';
      lowerEl.style.top = '0';
      lowerEl.style.left = '0';
    }
    if (upperEl) {
      upperEl.style.position = 'absolute';
      upperEl.style.top = '0';
      upperEl.style.left = '0';
    }

    // Ensure Fabric internal sizes align with CSS sizes
    fabricCanvas.setDimensions({ width: nextWidth, height: nextHeight });
    fabricCanvas.setWidth(nextWidth);
    fabricCanvas.setHeight(nextHeight);
    if (lowerEl) {
      lowerEl.width = nextWidth;
      lowerEl.height = nextHeight;
    }
    if (upperEl) {
      upperEl.width = nextWidth;
      upperEl.height = nextHeight;
    }

    fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    fabricCanvas.calcOffset();
    fabricCanvas.requestRenderAll();
  }, []);

  const reloadSvgLibrary = useCallback(() => {
    try {
      const raw = localStorage.getItem(SVG_LIBRARY_STORAGE_KEY);
      if (!raw) {
        setSvgLibrary([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSvgLibrary(parsed as SvgAsset[]);
      } else {
        setSvgLibrary([]);
      }
    } catch (error) {
      console.warn("Failed to parse SVG library", error);
      setSvgLibrary([]);
    }
  }, []);

  const reloadGallery = useCallback(() => {
    try {
      const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
      if (!raw) { return; }
      const parsed = JSON.parse(raw) as CapturedPhoto[];
      if (!Array.isArray(parsed)) {
        // Invalid data, ignore
      }
    } catch (e) {
      console.warn("Failed to parse gallery", e);
    }
  }, []);

  useEffect(() => {
    reloadSvgLibrary();
    const handleUpdate = () => reloadSvgLibrary();
    window.addEventListener("svg-library-updated", handleUpdate);
    reloadGallery();
    const handleGallery = () => reloadGallery();
    window.addEventListener("gallery-updated", handleGallery);
    return () => {
      window.removeEventListener("svg-library-updated", handleUpdate);
      window.removeEventListener("gallery-updated", handleGallery);
    };
  }, [reloadSvgLibrary, reloadGallery]);
  

  
  useEffect(() => {
    let isMounted = true;
    let currentPlayPromise: Promise<void> | null = null;
    cancelPlayRef.current = false;
    
    // Capture ref at the start of the effect for cleanup
    const videoEl = videoRef.current;

    const mediaDevices = navigator.mediaDevices;

    if (!mediaDevices?.getUserMedia) {
      setCameraError("Camera API is not available in this environment.");
      setVideoReady(false);
      setDevices([]);
      return () => {
        isMounted = false;
        cancelPlayRef.current = true;
      };
    }

    const startCamera = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          video: selectedDeviceId 
            ? { deviceId: { exact: selectedDeviceId } }
            : { 
                facingMode: facingMode, 
                width: { ideal: 1920, max: 1920 }, 
                height: { ideal: 1080, max: 1080 }
              },
          audio: false
        });

        if (!isMounted || cancelPlayRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;

        
        await new Promise<void>((resolve) => {
          if (video.readyState >= 2) {
            resolve();
          } else {
            const onLoaded = () => {
              video.removeEventListener("loadedmetadata", onLoaded);
              resolve();
            };
            video.addEventListener("loadedmetadata", onLoaded);
          }
        });

        if (!isMounted || cancelPlayRef.current) return;

        
        try {
          currentPlayPromise = video.play();
          playPromiseRef.current = currentPlayPromise;
          await currentPlayPromise;
          
          if (!isMounted || cancelPlayRef.current) return;
          
          setVideoReady(true);
          setCameraError(null);
        } catch (error: any) {
          
          if (error?.name === "AbortError" || !isMounted || cancelPlayRef.current) {
            return;
          }
          console.warn("Video play() error:", error?.name);
          if (isMounted) {
            setCameraError("Failed to play video");
            setVideoReady(false);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        const name = err?.name || 'Error';
        let friendly = "Failed to start camera.";
        if (name === "NotAllowedError") friendly = "Camera access denied.";
        else if (name === "NotFoundError") friendly = "Camera not found.";
        else if (name === "NotReadableError") friendly = "Camera is busy by another application.";
        
        setCameraError(`${friendly} (${name})`);
      }
    };

    
    if (mediaDevices.enumerateDevices) {
      mediaDevices.enumerateDevices()
        .then(all => {
          if (!isMounted) return;
          const videos = all.filter(d => d.kind === 'videoinput');
          setDevices(videos.map(v => ({ 
            label: v.label || `Camera ${v.deviceId.slice(0, 6)}`, 
            deviceId: v.deviceId 
          })));
        })
        .catch(() => {});
    } else {
      setDevices([]);
    }

    startCamera();

    return () => {
      isMounted = false;
      cancelPlayRef.current = true;

      // Use the stable videoEl captured at effect start
      const finishingPlayPromise = currentPlayPromise;
      const currentStream = streamRef.current;

      const cleanup = async () => {
        if (finishingPlayPromise) {
          try {
            await finishingPlayPromise;
          } catch (e) {
            
          }
        }

        if (currentStream) {
          currentStream.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        if (videoEl) {
          videoEl.srcObject = null;
        }

        playPromiseRef.current = null;
      };

      cleanup();
    };
  }, [restartTick, selectedDeviceId, facingMode]);

  

  const handleRetryCamera = () => setRestartTick((n) => n + 1);
  
  const handleSwitchCamera = useCallback(() => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
    setRestartTick((n) => n + 1);
  }, []);

  
  useEffect(() => {
    if (!fabricCanvasRef.current || fabricRef.current) return;

    const canvasEl = fabricCanvasRef.current;

    try {
      const context = canvasEl.getContext("2d");
      if (!context) {
        console.warn("Canvas context unavailable; skipping Fabric setup.");
        return;
      }
    } catch (error) {
      console.warn("Canvas context not supported in this environment; skipping Fabric setup.", error);
      return;
    }

    // Set initial size BEFORE Fabric wraps the canvas, to avoid a small default 300x150 wrapper
    const host = canvasEl.parentElement;
    const bounds = host?.getBoundingClientRect();
    const initW = Math.max(1, Math.round(bounds?.width ?? window.innerWidth));
    const initH = Math.max(1, Math.round(bounds?.height ?? window.innerHeight));
    canvasEl.width = initW;
    canvasEl.height = initH;
    canvasEl.style.width = `${initW}px`;
    canvasEl.style.height = `${initH}px`;

    fabricRef.current = new fabric.Canvas(canvasEl, {
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: false,
      stateful: false,
      renderOnAddRemove: false,
      backgroundColor: 'transparent',
      skipOffscreen: true,
      stopContextMenu: true,
      fireRightClick: false,
      fireMiddleClick: false,
      uniformScaling: false,
      // Performance optimizations
      perPixelTargetFind: false,
      targetFindTolerance: 4,
    });

    // Custom delete control (X button on top-right)
    const deleteIcon = "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";
    
    const deleteImg = document.createElement('img');
    deleteImg.src = deleteIcon;

    function renderDeleteIcon(ctx: CanvasRenderingContext2D, left: number, top: number, styleOverride: any, fabricObject: fabric.Object) {
      const size = 24;
      ctx.save();
      ctx.translate(left, top);
      ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle || 0));
      ctx.drawImage(deleteImg, -size/2, -size/2, size, size);
      ctx.restore();
    }

    function deleteObject(eventData: MouseEvent, transform: any) {
      const target = transform.target;
      const canvas = target.canvas;
      canvas.remove(target);
      canvas.requestRenderAll();
      return true;
    }

    (fabric.Object.prototype as any).controls.deleteControl = new fabric.Control({
      x: 0.5,
      y: -0.5,
      offsetY: -16,
      offsetX: 16,
      cursorStyle: 'pointer',
      mouseUpHandler: deleteObject,
      render: renderDeleteIcon,
      sizeX: 24,
      sizeY: 24
    });

  updateCanvasSize();

    const canvas = fabricRef.current;
    const ctx = canvas.getContext();
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }

    // Performance: throttled render during transformations
    let isTransforming = false;
    let rafId: number | null = null;

    function throttledRender() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        fabricRef.current?.renderAll();
        rafId = null;
      });
    }

    // Optimized event handlers
    canvas.on("object:added", () => fabricRef.current?.requestRenderAll());
    canvas.on("object:removed", () => fabricRef.current?.requestRenderAll());
    
    canvas.on("object:moving", () => {
      isTransforming = true;
      throttledRender();
    });
    canvas.on("object:scaling", throttledRender);
    canvas.on("object:rotating", throttledRender);
    
    canvas.on("object:modified", () => {
      isTransforming = false;
      fabricRef.current?.requestRenderAll();
    });
    
    canvas.on("mouse:up", () => {
      if (isTransforming) {
        isTransforming = false;
        fabricRef.current?.requestRenderAll();
      }
    });
    
    canvas.on("selection:created", () => fabricRef.current?.requestRenderAll());
    canvas.on("selection:cleared", () => fabricRef.current?.requestRenderAll());
    canvas.on("selection:updated", () => fabricRef.current?.requestRenderAll());
    
    
    
    return () => {
      if (fabricRef.current) {
        fabricRef.current.off();
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [updateCanvasSize]);

  
  useEffect(() => {
    updateCanvasSize();

    const handleResize = () => updateCanvasSize();
    window.addEventListener("resize", handleResize);

    const parent = fabricCanvasRef.current?.parentElement ?? null;
    const resizeObserver = typeof ResizeObserver !== "undefined" && parent
      ? new ResizeObserver(() => updateCanvasSize())
      : null;
    if (resizeObserver && parent) {
      resizeObserver.observe(parent);
    }

    const video = videoRef.current;
    const onLoadedMetadata = () => updateCanvasSize();
    video?.addEventListener("loadedmetadata", onLoadedMetadata);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      video?.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [updateCanvasSize]);

  
  const handleAddObject = useCallback((type: string, imageSrc?: string) => {
    if (!fabricRef.current) return;
    
    // Detect mobile device
    const isMobile = window.innerWidth <= 768;
    const scaleFactor = isMobile ? 0.6 : 1.0;
    
    const shadowConfig = new fabric.Shadow({
      color: 'rgba(0,0,0,0.5)',
      blur: 20,
      offsetX: 8,
      offsetY: 8,
    });

    if (type === "rect") {
      const obj = new fabric.Rect({
        left: 100,
        top: 100,
        fill: "rgba(255, 215, 0, 0.85)",
        width: 80 * scaleFactor,
        height: 40 * scaleFactor,
        stroke: "rgba(255, 255, 255, 0.9)",
        strokeWidth: 3,
        rx: 5,
        ry: 5,
        shadow: shadowConfig,
        opacity: 0.92,
        cornerStyle: 'circle' as const,
      });
      fabricRef.current.add(obj);
      fabricRef.current.setActiveObject(obj);
      fabricRef.current.renderAll();
    } else if (type === "image" && imageSrc) {
      const isMobile = window.innerWidth <= 768;
      const scaleFactor = isMobile ? 0.3 : 0.4;
      
      fabric.Image.fromURL(imageSrc, (img) => {
        // Try to remove white/black background via RemoveColor filters (if available)
        try {
          const Filters: any = (fabric.Image as any).filters;
          const hasRemove = Filters && typeof Filters.RemoveColor === 'function';
          if (hasRemove) {
            const white = new Filters.RemoveColor({ color: '#ffffff', distance: 0.2 });
            const black = new Filters.RemoveColor({ color: '#000000', distance: 0.2 });
            img.filters = [white, black];
            (img as any).applyFilters?.();
          }
        } catch {}

        img.set({
          left: 120,
          top: 120,
          scaleX: scaleFactor,
          scaleY: scaleFactor,
          shadow: shadowConfig,
          opacity: 0.95,
          cornerStyle: 'circle' as const,
          objectCaching: true,
          statefullCache: true,
          noScaleCache: false,
          cacheProperties: ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'width', 'height'],
        });
        fabricRef.current!.add(img);
        fabricRef.current!.setActiveObject(img);
        fabricRef.current!.requestRenderAll();
        if (imageSrc.startsWith("blob:")) {
          URL.revokeObjectURL(imageSrc);
        }
      }, { crossOrigin: "anonymous" });
    } else if (type === "svg" && imageSrc) {
      const source = imageSrc;
      const urlToFetch = /^data:|^blob:/i.test(source) ? source : encodeURI(source);
      fetch(urlToFetch)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} while fetching ${urlToFetch}`);
          }
          return response.text();
        })
        .then((svgText) => {
          fabric.loadSVGFromString(svgText, (objects, options) => {
            // Heuristic: drop giant white/black (and near-white/near-black) background shapes before grouping
            try {
              const toColorString = (fill: any) => (typeof fill === 'string' ? String(fill).toLowerCase() : '');
              const parseRGB = (fill: any): {r:number;g:number;b:number}|null => {
                try {
                  if (!fill || typeof fill !== 'string') return null;
                  const f = toColorString(fill).trim();
                  // Named colors
                  if (f === 'white') return { r:255, g:255, b:255 };
                  if (f === 'black') return { r:0, g:0, b:0 };
                  // #rgb or #rrggbb
                  if (/^#([0-9a-f]{3}){1,2}$/i.test(f)) {
                    let r:number, g:number, b:number;
                    if (f.length === 4) {
                      r = parseInt(f[1]+f[1],16);
                      g = parseInt(f[2]+f[2],16);
                      b = parseInt(f[3]+f[3],16);
                    } else {
                      r = parseInt(f.slice(1,3),16);
                      g = parseInt(f.slice(3,5),16);
                      b = parseInt(f.slice(5,7),16);
                    }
                    return { r,g,b };
                  }
                  // rgb(a)
                  const m = f.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
                  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
                } catch {}
                return null;
              };
              const isNearWhiteOrBlack = (fill: any) => {
                const fstr = toColorString(fill).replace(/\s+/g, '');
                if (
                  fstr === '#fff' || fstr === '#ffffff' || fstr === 'white' || fstr === 'rgb(255,255,255)' ||
                  fstr === '#000' || fstr === '#000000' || fstr === 'black' || fstr === 'rgb(0,0,0)'
                ) return true;
                const rgb = parseRGB(fill);
                if (!rgb) return false;
                const nearWhite = rgb.r >= 245 && rgb.g >= 245 && rgb.b >= 245;
                const nearBlack = rgb.r <= 12 && rgb.g <= 12 && rgb.b <= 12;
                return nearWhite || nearBlack;
              };

              // Compute overall bounding box across all objects
              let minX = Number.POSITIVE_INFINITY;
              let minY = Number.POSITIVE_INFINITY;
              let maxX = Number.NEGATIVE_INFINITY;
              let maxY = Number.NEGATIVE_INFINITY;
              const getBR = (o: any) => (typeof o.getBoundingRect === 'function'
                ? o.getBoundingRect(true, true)
                : { left: o.left || 0, top: o.top || 0, width: (o.width || 0) * (o.scaleX || 1), height: (o.height || 0) * (o.scaleY || 1) });
              (objects as any[]).forEach(o => {
                const br = getBR(o);
                minX = Math.min(minX, br.left);
                minY = Math.min(minY, br.top);
                maxX = Math.max(maxX, br.left + br.width);
                maxY = Math.max(maxY, br.top + br.height);
              });
              const globalW = Math.max(1, maxX - minX);
              const globalH = Math.max(1, maxY - minY);
              const globalA = globalW * globalH;

              const filtered = (objects as any[]).filter((o) => {
                if (!o) return false;
                // Only consider likely background primitives
                const typeOk = o.type === 'rect' || o.type === 'path' || o.type === 'polygon' || o.type === 'ellipse' || o.type === 'circle';
                if (typeOk && isNearWhiteOrBlack((o as any).fill)) {
                  const br = getBR(o);
                  const coverW = br.width / globalW;
                  const coverH = br.height / globalH;
                  const areaFrac = (br.width * br.height) / globalA;
                  const coversAlmostAll = (coverW >= 0.9 && coverH >= 0.9) || areaFrac >= 0.82;
                  if (coversAlmostAll) {
                    return false; // drop background
                  }
                }
                return true; // keep
              });
              objects = filtered as any;

              // If there are internal pure-black fills left, prefer raster fallback with RemoveColor to clear holes
              const hasPureBlackFill = (fill: any) => {
                const rgb = parseRGB(fill);
                return !!rgb && rgb.r <= 5 && rgb.g <= 5 && rgb.b <= 5;
              };
              const needsRasterBlackRemoval = (objects as any[]).some((o) => {
                const f = (o as any).fill;
                if (!f || f === 'none') return false;
                return hasPureBlackFill(f);
              });

              if (needsRasterBlackRemoval) {
                const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText);
                fabric.Image.fromURL(svgDataUrl, (img) => {
                  try {
                    const Filters: any = (fabric.Image as any).filters;
                    if (Filters && typeof Filters.RemoveColor === 'function') {
                      const black = new Filters.RemoveColor({ color: '#000000', distance: 0.12 });
                      img.filters = [black];
                      (img as any).applyFilters?.();
                    }
                  } catch {}

                  img.set({
                    left: 140,
                    top: 140,
                    shadow: shadowConfig,
                    opacity: 0.95,
                    cornerStyle: 'circle' as const,
                    objectCaching: true,
                    statefullCache: true,
                    noScaleCache: false,
                  });

                  const iw = img.width ?? 0;
                  const ih = img.height ?? 0;
                  const maxDim = Math.max(iw, ih);
                  if (maxDim > 0) {
                    const isMobile = window.innerWidth <= 768;
                    const target = isMobile ? 150 : 200;
                    const factor = Math.min(1, target / maxDim);
                    img.scale(factor);
                  }

                  fabricRef.current!.add(img);
                  fabricRef.current!.setActiveObject(img);
                  fabricRef.current!.requestRenderAll();
                }, { crossOrigin: 'anonymous' });
                return; // Skip vector add path, we've added rasterized image instead
              }
            } catch {}

            const grouped = fabric.util.groupSVGElements(
              objects as fabric.Object[],
              options || {}
            );
            grouped.set({
              left: 140,
              top: 140,
              shadow: shadowConfig,
              opacity: 0.95,
              cornerStyle: 'circle' as const,
              objectCaching: true,
              statefullCache: true,
              noScaleCache: false,
            });

            const width = grouped.width ?? 0;
            const height = grouped.height ?? 0;
            const maxDim = Math.max(width, height);
            if (maxDim > 0) {
              const isMobile = window.innerWidth <= 768;
              const target = isMobile ? 150 : 200;
              const factor = Math.min(1, target / maxDim);
              grouped.scale(factor);
            }

            fabricRef.current!.add(grouped);
            fabricRef.current!.setActiveObject(grouped);
            fabricRef.current!.requestRenderAll();
          });
        })
        .catch((error) => {
          console.error("SVG load error", error);
          alert(`Could not add SVG (${error}). Please check the path or the file.`);
        })
        .finally(() => {
          if (source.startsWith("blob:")) {
            URL.revokeObjectURL(source);
          }
        });
    } else if (type === "circle") {
      const isMobile = window.innerWidth <= 768;
      const radius = isMobile ? 20 : 30;
      
      const obj = new fabric.Circle({
        left: 100,
        top: 100,
        fill: "rgba(135, 206, 250, 0.85)",
        radius: radius,
        stroke: "rgba(255, 255, 255, 0.9)",
        strokeWidth: 3,
        shadow: shadowConfig,
        opacity: 0.92,
        cornerStyle: 'circle' as const,
      });
      fabricRef.current.add(obj);
      fabricRef.current.setActiveObject(obj);
      fabricRef.current.renderAll();
    }
  }, []);

  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" && fabricRef.current) {
        const active = fabricRef.current.getActiveObject();
        if (active) {
          fabricRef.current.remove(active);
          fabricRef.current.renderAll();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !fabricRef.current || !fabricCanvasRef.current) {
      console.error("Video or Fabric canvas not ready");
      alert("Components not ready. Please try again.");
      return;
    }
    
    const video = videoRef.current;
    const fabricCanvas = fabricRef.current;
    
    
    if (!videoReady || video.readyState < 2 || video.paused) {
      console.error("Video not ready", { 
        videoReady, 
        readyState: video.readyState, 
        paused: video.paused 
      });
      alert("Video not ready yet, please try again");
      return;
    }

    
    requestAnimationFrame(() => {
      
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      console.log("=== CAPTURE START ===");
      console.log("Video dimensions:", { 
        videoWidth, 
        videoHeight,
        readyState: video.readyState,
        paused: video.paused,
        currentTime: video.currentTime
      });

      if (videoWidth === 0 || videoHeight === 0) {
        console.error("Video dimensions are zero!");
        alert("Cannot capture image - invalid video dimensions");
        return;
      }

      
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoWidth;
      tempCanvas.height = videoHeight;
      
      console.log("Canvas created:", { width: tempCanvas.width, height: tempCanvas.height });
      
      const ctx = tempCanvas.getContext("2d", { 
        alpha: true,
        willReadFrequently: false 
      });
      
      if (!ctx) {
        console.error("Failed to get canvas context");
        alert("Error creating canvas");
        return;
      }

      try {
        
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, videoWidth, videoHeight);
        console.log("Black background drawn");

        
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        console.log("Video drawn to canvas");
        
        
        const imageData = ctx.getImageData(0, 0, 1, 1);
        console.log("First pixel after video draw:", imageData.data);

        
        const fabricElement = fabricCanvas.getElement();
        const fabricWidth = fabricElement.width;
        const fabricHeight = fabricElement.height;
        
        console.log("Fabric canvas:", { fabricWidth, fabricHeight });
        
        if (fabricWidth > 0 && fabricHeight > 0) {
          
          fabricCanvas.renderAll();
          
          
          const scaleX = videoWidth / fabricWidth;
          const scaleY = videoHeight / fabricHeight;
          
          console.log("Scale factors:", { scaleX, scaleY });
          
          ctx.save();
          ctx.scale(scaleX, scaleY);
          ctx.drawImage(fabricElement, 0, 0);
          ctx.restore();
          
          console.log("Fabric overlay drawn");
        }

        
        const finalImage = tempCanvas.toDataURL("image/jpeg", 0.92);
        console.log("Final image created, length:", finalImage.length);
        console.log("Data URL prefix:", finalImage.substring(0, 50));
        
        if (finalImage.length < 1000) {
          console.error("Image too small, might be empty!");
          alert("Image seems empty. Length: " + finalImage.length);
          return;
        }
        
        console.log("=== CAPTURE SUCCESS ===");
        setCapturedImage(finalImage);
        setIsPreview(true);
      } catch (error) {
        console.error("Error during capture:", error);
        alert("Error during capture: " + error);
      }
    });
  }, [videoReady]);

  const addToGallery = useCallback((image: string) => {
    try {
      const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
      const list: CapturedPhoto[] = raw ? JSON.parse(raw) : [];
      const item: CapturedPhoto = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        dataUrl: image,
        createdAt: Date.now(),
      };
      const next = [item, ...list].slice(0, 60); // cap at 60 items
      localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("gallery-updated"));
    } catch (e) {
      console.error("Failed to add to gallery", e);
      alert("Failed to save to gallery.");
    }
  }, []);

  const handleSaveLayout = useCallback(() => {
    if (!fabricRef.current) {
      alert("Canvas is not ready.");
      return;
    }
    try {
      const nameDefault = `Layout ${new Date().toLocaleString()}`;
      const name = window.prompt("Name this layout:", nameDefault) || nameDefault;
      
      // Save with all custom properties
      const json = fabricRef.current.toJSON([
        'selectable',
        'evented',
        'shadow',
        'opacity',
        'cornerStyle',
        'objectCaching',
        'statefullCache',
        'noScaleCache',
        'cacheProperties',
        'src',
        'crossOrigin'
      ]);
      
      console.log('💾 Saving layout:', name, json);
      
      const raw = localStorage.getItem("IFM_LAYOUTS");
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({ id: Date.now(), name, json, savedAt: Date.now() });
      const saved = JSON.stringify(list.slice(0, 20));
      localStorage.setItem("IFM_LAYOUTS", saved);
      
      console.log('✅ Layout saved successfully. Total layouts:', list.length);
      alert(`✅ Layout "${name}" saved successfully!`);
    } catch (e) {
      console.error("❌ Save layout failed:", e);
      alert("Failed to save layout: " + (e as Error).message);
    }
  }, []);

  const handleLoadLayout = useCallback(() => {
    if (!fabricRef.current) {
      alert("Canvas is not ready.");
      return;
    }
    try {
      const raw = localStorage.getItem("IFM_LAYOUTS");
      console.log('📂 Loading layouts from storage:', raw ? 'Found' : 'Not found');
      
      const list: Array<{ id:number; name:string; json:any; savedAt:number }> = raw ? JSON.parse(raw) : [];
      
      if (!list.length) {
        alert("No saved layouts found. Please save a layout first.");
        return;
      }
      
      console.log(`📋 Found ${list.length} saved layouts`);
      
      if (list.length === 1) {
        console.log('🔄 Loading single layout:', list[0].name);
        fabricRef.current.clear();
        fabricRef.current.loadFromJSON(list[0].json, () => {
          fabricRef.current!.requestRenderAll();
          console.log('✅ Layout loaded successfully');
          alert(`✅ Layout "${list[0].name}" loaded!`);
        });
        return;
      }
      
      const options = list
        .slice(0, 10)
        .map((item, idx) => `${idx + 1}. ${item.name} (${new Date(item.savedAt).toLocaleString()})`)
        .join("\n");
      const answer = window.prompt(`Choose a layout to load (enter number):\n${options}`, "1");
      
      if (!answer) {
        console.log('⚠️ User cancelled layout selection');
        return;
      }
      
      const index = Math.max(1, Math.min(10, parseInt(answer, 10))) - 1;
      const chosen = list[index] || list[0];
      
      console.log(`🔄 Loading layout #${index + 1}:`, chosen.name);
      
      fabricRef.current.clear();
      fabricRef.current.loadFromJSON(chosen.json, () => {
        fabricRef.current!.requestRenderAll();
        console.log('✅ Layout loaded successfully');
        alert(`✅ Layout "${chosen.name}" loaded!`);
      });
    } catch (e) {
      console.error("❌ Load layout failed:", e);
      alert("Failed to load layout: " + (e as Error).message);
    }
  }, []);

  const handleDeleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) {
      alert("Canvas is not ready.");
      return;
    }
    const active = canvas.getActiveObject();
    if (!active) {
      alert("No object selected.");
      return;
    }
    canvas.remove(active);
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        {}
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className={styles.video} 
        />
        
        {}
        <canvas 
          ref={fabricCanvasRef} 
          className={styles.canvas}
        />
        
        {cameraError && (
          <div className={styles.cameraError}>
            <span>{cameraError}</span>
            <button className={styles.retryBtn} onClick={handleRetryCamera}>Retry</button>
            {devices.length > 0 && (
              <div className={styles.devicePicker}>
                <label htmlFor="deviceSel">Camera:</label>
                <select
                  id="deviceSel"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  <option value="">Any</option>
                  {devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${d.deviceId.slice(0,6)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
        
        {/* Camera switch button for mobile */}
        {videoReady && !cameraError && (
          <button 
            className={styles.switchCameraBtn}
            onClick={handleSwitchCamera}
            title="Switch Camera"
          >
            🔄
          </button>
        )}
        
        {svgLibrary.length > 0 && (
          <div className={styles.svgLibrary}>
            {svgLibrary.map((asset) => {
              // Detect if it's SVG or raster image (PNG/JPG)
              const isSvg = asset.dataUrl.includes('svg');
              const type = isSvg ? "svg" : "image";
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => handleAddObject(type, asset.dataUrl)}
                >
                  {asset.name}
                </button>
              );
            })}
          </div>
        )}

  <ObjectToolbar 
    onAdd={handleAddObject} 
    onCapture={handleCapture} 
    onSaveLayout={handleSaveLayout} 
    onLoadLayout={handleLoadLayout}
    onDeleteSelected={handleDeleteSelected}
    onOpenGallery={onOpenGallery}
  />
        
        {isPreview && capturedImage && (
          <PreviewModal
            image={capturedImage}
            onClose={() => setIsPreview(false)}
            onFinalize={(img) => addToGallery(img)}
          />
        )}
      </div>
    </div>
  );
};

export default CameraOverlay;
