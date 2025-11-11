import { useEffect, useRef } from 'react';
import { fabric } from 'fabric';

interface TouchGesturesOptions {
  canvas: fabric.Canvas | null;
  enabled?: boolean;
}

export const useTouchGestures = ({ canvas, enabled = true }: TouchGesturesOptions) => {
  const touchStateRef = useRef({
    lastDistance: 0,
    lastScale: 1,
    isPinching: false,
    lastTap: 0,
    doubleTapDelay: 300,
  });

  useEffect(() => {
    if (!canvas || !enabled) return;

    const state = touchStateRef.current;

    /**
     * Calculate Euclidean distance between two touch points
     * Used for pinch-to-zoom gesture detection
     */
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * Calculate midpoint between two touch points
     * Reserved for future rotation pivot implementation
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _getTouchCenter = (touches: TouchList): { x: number; y: number } => {
      if (touches.length < 2) {
        return { x: touches[0].clientX, y: touches[0].clientY };
      }
      return {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2,
      };
    };

    /**
     * Initialize pinch gesture on two-finger touch
     * Captures initial distance and object scale
     */
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        state.isPinching = true;
        state.lastDistance = getTouchDistance(e.touches);
        
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          state.lastScale = activeObj.scaleX || 1;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && state.isPinching) {
        e.preventDefault();

        const currentDistance = getTouchDistance(e.touches);
        const activeObj = canvas.getActiveObject();

        if (activeObj && state.lastDistance > 0) {
          const scaleDelta = currentDistance / state.lastDistance;
          const newScale = state.lastScale * scaleDelta;

          // Clamp scale to prevent over-zoom or invisible objects
          const minScale = 0.1;
          const maxScale = 5;
          const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));

          activeObj.scale(clampedScale);
          canvas.requestRenderAll();
        }

        state.lastDistance = currentDistance;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        state.isPinching = false;
        state.lastDistance = 0;
        
        // Persist final scale for next pinch gesture
        const activeObj = canvas.getActiveObject();
        if (activeObj) {
          state.lastScale = activeObj.scaleX || 1;
        }
      }

      // Double-tap to reset scale to 1:1
      if (e.touches.length === 0 && e.changedTouches.length === 1) {
        const now = Date.now();
        const timeSinceLastTap = now - state.lastTap;

        if (timeSinceLastTap < state.doubleTapDelay) {
          // Double-tap detected, reset object scale
          const activeObj = canvas.getActiveObject();
          if (activeObj) {
            // Reset scale to original size
            activeObj.scale(1);
            canvas.requestRenderAll();
          }
          state.lastTap = 0; // Prevent triple-tap trigger
        } else {
          state.lastTap = now;
        }
      }
    };

    // Attach listeners to canvas DOM element
    const canvasElement = canvas.getElement();
    if (!canvasElement) return;

    // Passive: false required to preventDefault on touchmove
    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvas, enabled]);
};
