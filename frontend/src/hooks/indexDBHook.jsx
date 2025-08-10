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
        return () => { isMounted = false; };
    }, [key]);

    // Save to IndexedDB whenever state changes
    const setValue = useCallback(
        (value) => {
            setState((prev) => {
                const newValue = typeof value === "function" ? value(prev) : value;
                localforage.setItem(key, newValue);
                return newValue;
            });
        },
        [key]
    );

    return [state, setValue, isLoaded];
}
