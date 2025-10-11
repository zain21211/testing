import { useRef } from "react";

export function useLongPress( delay = 800) {
  const timerRef = useRef<number | null>(null);

  const start = (callback: () => void) => {
    timerRef.current = window.setTimeout(callback, delay);
  };

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (callback: () => void)=>({
      onMouseDown: () => start(callback),
    onTouchStart: () => start(callback),
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchEnd: clear,
  });
}
