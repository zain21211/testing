import { useRef, useEffect, useCallback } from "react";

/**
 * useLongPress
 * 
 * Provides long-press detection for touch or mouse events.
 * 
 * @param delay - Duration (in ms) to trigger the long press (default 800ms)
 * @returns Function that takes a callback and returns event handlers
 */
export function useLongPress(delay: number = 800) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // Set to true after mount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const start = useCallback(
    (callback: () => void) =>
      (e: React.MouseEvent | React.TouchEvent) => {
        if (!mountedRef.current) return;

        // 🧱 Ignore accidental multi-touch or ghost events
        if ("touches" in e && e.touches.length > 1) return;

        // Start the timer for long press
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) callback();
        }, delay);
      },
    [delay]
  );

  const stop = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Returns event handlers to spread into your component
   */
  const getLongPressProps = useCallback(
    (callback: () => void) => ({
      onMouseDown: start(callback),
      onTouchStart: start(callback),
      onMouseUp: stop,
      onMouseLeave: stop,
      onTouchEnd: stop,
      onTouchCancel: stop,
    }),
    [start, stop]
  );

  return getLongPressProps;
}
