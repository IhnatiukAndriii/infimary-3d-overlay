import React, { useRef, useEffect, useState, useCallback } from "react";
import { fabric } from "fabric";
import ObjectToolbar from "./ObjectToolbar";
import PreviewModal from "./PreviewModal";
import styles from "./CameraOverlay.module.css";

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
  

  // Відкрити камеру - ПОВНІСТЮ ВИПРАВЛЕНА ВЕРСІЯ
  useEffect(() => {
    let isMounted = true;
    let currentPlayPromise: Promise<void> | null = null;
    cancelPlayRef.current = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
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

        // Чекаємо готовності метаданих
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

        // Запускаємо відтворення
        try {
          currentPlayPromise = video.play();
          playPromiseRef.current = currentPlayPromise;
          await currentPlayPromise;
          
          if (!isMounted || cancelPlayRef.current) return;
          
          setVideoReady(true);
          setCameraError(null);
        } catch (error: any) {
          // Ігноруємо AbortError - це нормально при cleanup
          if (error?.name === "AbortError" || !isMounted || cancelPlayRef.current) {
            return;
          }
          console.warn("Video play() error:", error?.name);
          if (isMounted) {
            setCameraError("Не вдалося відтворити відео");
            setVideoReady(false);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        
        const name = err?.name || 'Error';
        let friendly = "Не вдалося запустити камеру.";
        if (name === "NotAllowedError") friendly = "Доступ до камери заборонено.";
        else if (name === "NotFoundError") friendly = "Камеру не знайдено.";
        else if (name === "NotReadableError") friendly = "Камера зайнята іншою програмою.";
        
        setCameraError(`${friendly} (${name})`);
      }
    };

    // Отримати список камер
    navigator.mediaDevices.enumerateDevices()
      .then(all => {
        if (!isMounted) return;
        const videos = all.filter(d => d.kind === 'videoinput');
        setDevices(videos.map(v => ({ 
          label: v.label || `Camera ${v.deviceId.slice(0, 6)}`, 
          deviceId: v.deviceId 
        })));
      })
      .catch(() => {});

    startCamera();

    return () => {
      isMounted = false;
      cancelPlayRef.current = true;
      
      // Чекаємо завершення play promise перед cleanup
      const cleanup = async () => {
        if (currentPlayPromise) {
          try {
            await currentPlayPromise;
          } catch (e) {
            // Ігноруємо помилки
          }
        }

        const video = videoRef.current;
        
        // Зупиняємо stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        
        // Чистимо video element тільки після завершення play()
        if (video) {
          video.srcObject = null;
        }

        playPromiseRef.current = null;
        setVideoReady(false);
        setCameraError(null);
      };

      cleanup();
    };
  }, [restartTick, selectedDeviceId]);

  // Вилучено панель діагностики та перемикач Fabric

  const handleRetryCamera = () => setRestartTick((n) => n + 1);

  // Ініціалізація Fabric.js
  useEffect(() => {
    if (!fabricCanvasRef.current || fabricRef.current) return;
    
    const canvasEl = fabricCanvasRef.current;

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

    const canvas = fabricRef.current;
    const ctx = canvas.getContext();
    ctx.imageSmoothingEnabled = false;

    // ПОВНІСТЮ ВИМКНУТИ автоматичний рендеринг - тільки вручну
    // Рендерити тільки коли користувач відпустив мишу
    let isInteracting = false;
    
    const startInteraction = () => {
      isInteracting = true;
    };
    
    const endInteraction = () => {
      isInteracting = false;
      // Рендерити тільки раз на кінець
      setTimeout(() => {
        fabricRef.current?.renderAll();
      }, 0);
    };

    canvas.on("object:added", () => fabricRef.current?.renderAll());
    canvas.on("object:removed", () => fabricRef.current?.renderAll());
    canvas.on("object:modified", endInteraction);
    
    canvas.on("mouse:down", startInteraction);
    canvas.on("mouse:up", endInteraction);
    canvas.on("selection:created", () => fabricRef.current?.renderAll());
    canvas.on("selection:cleared", () => fabricRef.current?.renderAll());
    canvas.on("selection:updated", () => fabricRef.current?.renderAll());
    
    // КРИТИЧНО: вимкнути всі інші події що можуть тригерити рендеринг
    canvas.on("object:moving", () => {}); // Нічого не робити під час руху
    canvas.on("object:scaling", () => {});
    canvas.on("object:rotating", () => {});
    
    // Вилучено діагностику рендерингу
    
    return () => {
      if (fabricRef.current) {
        fabricRef.current.off();
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  // Синхронізувати розмір Fabric canvas - ОДИН РАЗ
  useEffect(() => {
    if (!videoReady) return;
    
    const updateCanvasSize = () => {
      if (!videoRef.current || !fabricCanvasRef.current || !fabricRef.current) return;

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      const container = fabricCanvasRef.current.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      // Оновити тільки Fabric canvas
      fabricRef.current.setDimensions({ 
        width: containerWidth, 
        height: containerHeight 
      });
      
      fabricRef.current.setViewportTransform([1, 0, 0, 1, 0, 0]);
      fabricRef.current.calcOffset();
      fabricRef.current.renderAll();
    };

    const video = videoRef.current;
    video?.addEventListener("loadedmetadata", updateCanvasSize);
    // ПРИБРАЛИ "playing" та "resize" - вони викликають мерехтіння!

    // Виклик один раз через невелику затримку
    const timeout = setTimeout(updateCanvasSize, 300);

    return () => {
      clearTimeout(timeout);
      video?.removeEventListener("loadedmetadata", updateCanvasSize);
    };
  }, [videoReady]);

  // Додавання об'єкта з тулбара
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

  // Видалення активного об'єкта клавішею Delete
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

  // Захоплення знімка - ВИПРАВЛЕНА ВЕРСІЯ З АЛЬТЕРНАТИВНИМ МЕТОДОМ
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !fabricRef.current || !fabricCanvasRef.current) {
      console.error("Video or Fabric canvas not ready");
      alert("Компоненти не готові. Спробуйте ще раз.");
      return;
    }
    
    const video = videoRef.current;
    const fabricCanvas = fabricRef.current;
    
    // Перевірка що відео готове
    if (!videoReady || video.readyState < 2 || video.paused) {
      console.error("Video not ready", { 
        videoReady, 
        readyState: video.readyState, 
        paused: video.paused 
      });
      alert("Відео ще не готове, спробуйте ще раз");
      return;
    }

    // Чекаємо наступний кадр відео
    requestAnimationFrame(() => {
      // Отримуємо реальні розміри відео stream
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
        alert("Неможливо захопити зображення - невірні розміри відео");
        return;
      }

      // Створюємо canvas з розмірами відео
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
        alert("Помилка створення canvas");
        return;
      }

      try {
        // Заповнюємо чорним фоном для тесту
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, videoWidth, videoHeight);
        console.log("Black background drawn");

        // 1) Малюємо відео
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        console.log("Video drawn to canvas");
        
        // Перевіряємо чи відео намалювалось
        const imageData = ctx.getImageData(0, 0, 1, 1);
        console.log("First pixel after video draw:", imageData.data);

        // 2) Малюємо Fabric overlay
        const fabricElement = fabricCanvas.getElement();
        const fabricWidth = fabricElement.width;
        const fabricHeight = fabricElement.height;
        
        console.log("Fabric canvas:", { fabricWidth, fabricHeight });
        
        if (fabricWidth > 0 && fabricHeight > 0) {
          // Оновлюємо fabric перед експортом
          fabricCanvas.renderAll();
          
          // Масштабуємо до розмірів відео
          const scaleX = videoWidth / fabricWidth;
          const scaleY = videoHeight / fabricHeight;
          
          console.log("Scale factors:", { scaleX, scaleY });
          
          ctx.save();
          ctx.scale(scaleX, scaleY);
          ctx.drawImage(fabricElement, 0, 0);
          ctx.restore();
          
          console.log("Fabric overlay drawn");
        }

        // 3) Конвертуємо в dataURL
        const finalImage = tempCanvas.toDataURL("image/jpeg", 0.92);
        console.log("Final image created, length:", finalImage.length);
        console.log("Data URL prefix:", finalImage.substring(0, 50));
        
        if (finalImage.length < 1000) {
          console.error("Image too small, might be empty!");
          alert("Зображення здається пустим. Length: " + finalImage.length);
          return;
        }
        
        console.log("=== CAPTURE SUCCESS ===");
        setCapturedImage(finalImage);
        setIsPreview(true);
      } catch (error) {
        console.error("Error during capture:", error);
        alert("Помилка при захопленні: " + error);
      }
    });
  }, [videoReady]);

  return (
    <div className={styles.screen}>
      <div className={styles.container}>
        {/* ВИДИМЕ відео (нижній шар) */}
        <video 
          ref={videoRef} 
          playsInline 
          muted 
          className={styles.video} 
        />
        
        {/* Прозорий Fabric canvas поверх відео (верхній шар) */}
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
                <label htmlFor="deviceSel">Камера:</label>
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
        
        <ObjectToolbar onAdd={handleAddObject} />
        <button onClick={handleCapture} className={styles.captureBtn}>📸 Capture</button>
        
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
