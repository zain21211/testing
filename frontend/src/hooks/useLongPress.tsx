import { useRef } from "react";

export function useLongPress(callback: () => void, delay = 800) {
  const timerRef = useRef<number | null>(null);

  const start = () => {
    timerRef.current = window.setTimeout(callback, delay);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: start,
    onTouchEnd: clear,
  };
}
