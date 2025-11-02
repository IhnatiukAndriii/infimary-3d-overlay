import React, { useRef, useEffect, useState, useCallback } from "react";
import { fabric } from "fabric";
import ObjectToolbar from "./ObjectToolbar";
import PreviewModal from "./PreviewModal";
import styles from "./CameraOverlay.module.css";
import { SvgAsset, SVG_LIBRARY_STORAGE_KEY } from "../types/svg";

const CameraOverlay: React.FC = () => {
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
  const [svgLibrary, setSvgLibrary] = useState<SvgAsset[]>([]);

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

  useEffect(() => {
    reloadSvgLibrary();
    const handleUpdate = () => reloadSvgLibrary();
    window.addEventListener("svg-library-updated", handleUpdate);
    return () => {
      window.removeEventListener("svg-library-updated", handleUpdate);
    };
  }, [reloadSvgLibrary]);
  

  
  useEffect(() => {
    let isMounted = true;
    let currentPlayPromise: Promise<void> | null = null;
    cancelPlayRef.current = false;

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
            : { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
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

      // Capture current ref values to stable locals for cleanup to satisfy linting and avoid races
      const finishingPlayPromise = currentPlayPromise;
      const currentStream = streamRef.current;
      const videoEl = videoRef.current;

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
        setVideoReady(false);
        setCameraError(null);
      };

      cleanup();
    };
  }, [restartTick, selectedDeviceId]);

  

  const handleRetryCamera = () => setRestartTick((n) => n + 1);

  
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
    });

  updateCanvasSize();

    const canvas = fabricRef.current;
    const ctx = canvas.getContext();
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
    }

    
    
    canvas.on("object:added", () => fabricRef.current?.renderAll());
    canvas.on("object:removed", () => fabricRef.current?.renderAll());
    canvas.on("object:modified", () => {
      setTimeout(() => fabricRef.current?.renderAll(), 0);
    });
    canvas.on("mouse:down", () => {});
    canvas.on("mouse:up", () => {
      setTimeout(() => fabricRef.current?.renderAll(), 0);
    });
    canvas.on("selection:created", () => fabricRef.current?.renderAll());
    canvas.on("selection:cleared", () => fabricRef.current?.renderAll());
    canvas.on("selection:updated", () => fabricRef.current?.renderAll());
    
    
    
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
        width: 80,
        height: 40,
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
          scaleX: 0.4,
          scaleY: 0.4,
          shadow: shadowConfig,
          opacity: 0.95,
          cornerStyle: 'circle' as const,
        });
        fabricRef.current!.add(img);
        fabricRef.current!.setActiveObject(img);
        fabricRef.current!.renderAll();
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
                  });

                  const iw = img.width ?? 0;
                  const ih = img.height ?? 0;
                  const maxDim = Math.max(iw, ih);
                  if (maxDim > 0) {
                    const target = 200;
                    const factor = Math.min(1, target / maxDim);
                    img.scale(factor);
                  }

                  fabricRef.current!.add(img);
                  fabricRef.current!.setActiveObject(img);
                  fabricRef.current!.renderAll();
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
            });

            const width = grouped.width ?? 0;
            const height = grouped.height ?? 0;
            const maxDim = Math.max(width, height);
            if (maxDim > 0) {
              const target = 200;
              const factor = Math.min(1, target / maxDim);
              grouped.scale(factor);
            }

            fabricRef.current!.add(grouped);
            fabricRef.current!.setActiveObject(grouped);
            fabricRef.current!.renderAll();
          });
        })
        .catch((error) => {
          console.error("SVG load error", error);
          alert(`Не вдалося додати SVG (${error}). Перевірте шлях або файл.`);
        })
        .finally(() => {
          if (source.startsWith("blob:")) {
            URL.revokeObjectURL(source);
          }
        });
    } else if (type === "circle") {
      const obj = new fabric.Circle({
        left: 100,
        top: 100,
        fill: "rgba(135, 206, 250, 0.85)",
        radius: 30,
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
            <button className={styles.retryBtn} onClick={handleRetryCamera}>Повторити</button>
            {devices.length > 0 && (
              <div className={styles.devicePicker}>
                <label htmlFor="deviceSel">Camera:</label>
                <select
                  id="deviceSel"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  <option value="">Будь-яка</option>
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
        
        {svgLibrary.length > 0 && (
          <div className={styles.svgLibrary}>
            {svgLibrary.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => handleAddObject("svg", asset.dataUrl)}
              >
                {asset.name}
              </button>
            ))}
          </div>
        )}

  <ObjectToolbar onAdd={handleAddObject} onCapture={handleCapture} />
        
        {isPreview && capturedImage && (
          <PreviewModal
            image={capturedImage}
            onClose={() => setIsPreview(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CameraOverlay;
