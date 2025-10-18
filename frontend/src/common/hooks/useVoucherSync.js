import { useEffect, useCallback, useRef } from "react";

export const useVoucherSync = (entries = [], setEntries, func) => {
  const isSyncing = useRef(false); // ✅ always a ref object
  const intervalRef = useRef(null);

  console.log(isSyncing);
  const retryVoucher = useCallback(async () => {
    if (!func || entries.length === 0 || isSyncing.current) return;

    isSyncing.current = true;
    console.log("🔄 Retrying vouchers:", entries.length);

    try {
      for (const entry of entries) {
        try {
          await func(entry);
          //   const remaining = entries.filter((entry) => entry.id !== newEntry.id);
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        } catch (err) {
          console.warn(`❌ Failed for entry ${entry.id}, will retry later.`);
        }
      }
    } finally {
      isSyncing.current = false;
    }
  }, [entries, func]);

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

    // Start immediately if online
    startSync();

    // Listen for online/offline events
    window.addEventListener("online", startSync);
    window.addEventListener("offline", stopSync);

    return () => {
      stopSync();
      window.removeEventListener("online", startSync);
      window.removeEventListener("offline", stopSync);
    };
  }, [retryVoucher]);

  return { retryVoucher };
};
