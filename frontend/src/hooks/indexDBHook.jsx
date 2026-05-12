import { useState, useEffect, useCallback } from "react";
import localforage from "localforage";

export function useIndexedDBState(key, initialValue) {
  const [state, setState] = useState(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from IndexedDB on mount
  useEffect(() => {
    let isMounted = true;
    localforage.getItem(key).then((storedValue) => {
      if (isMounted) {
        if (storedValue !== null) {
          setState(storedValue);
        }
        setIsLoaded(true);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [key]);

  // Save to IndexedDB whenever state changes
  const setValue = useCallback(
    (value) => {
      setState((prev) => {
        const newValue = typeof value === "function" ? value(prev) : value;
        localforage.setItem(key, newValue).then(() => {
          // Notify other hooks using the same key
          window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key } }));
        });
        return newValue;
      });
    },
    [key]
  );

  // Listen for external changes (e.g. from background services)
  useEffect(() => {
    const handleSync = (event) => {
      if (event.detail?.key === key) {
        localforage.getItem(key).then((val) => {
          if (val !== null) setState(val);
        });
      }
    };
    window.addEventListener('indexeddb-change', handleSync);
    return () => window.removeEventListener('indexeddb-change', handleSync);
  }, [key]);

  return [state, setValue, isLoaded];
}
