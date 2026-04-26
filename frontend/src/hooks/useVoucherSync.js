import { useEffect, useCallback, useRef } from "react";

export const useVoucherSync = (entries = [], setEntries, func) => {
  const isSyncing = useRef(false); // ✅ always a ref object
  const intervalRef = useRef(null);

  const entriesRef = useRef(entries);
  
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const retryVoucher = useCallback(async () => {
    const currentEntries = entriesRef.current;
    if (!func || currentEntries.length === 0 || isSyncing.current) return;

    isSyncing.current = true;
    console.log("🔄 Retrying vouchers:", currentEntries.length);

    try {
      // Loop over a copy to avoid mutation issues during iteration
      for (const entry of [...currentEntries]) {
        try {
          await func(entry);
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        } catch (err) {
          console.warn(`❌ Failed for entry ${entry.id}, will retry later.`);
        }
      }
    } finally {
      isSyncing.current = false;
    }
  }, [func, setEntries]); // Removed entries dependency

  useEffect(() => {
    if (!func) return;

    const startSync = () => {
      if (navigator.onLine && !intervalRef.current) {
        console.log("🌐 Online — starting voucher sync loop");
        retryVoucher(); // run once immediately
        intervalRef.current = setInterval(retryVoucher, 8000);
      }
    };

    const stopSync = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("🛑 Stopped voucher sync loop");
      }
    };

    startSync();

    window.addEventListener("online", startSync);
    window.addEventListener("offline", stopSync);

    return () => {
      stopSync();
      window.removeEventListener("online", startSync);
      window.removeEventListener("offline", stopSync);
    };
  }, [retryVoucher, func]);

  return { retryVoucher };
};
