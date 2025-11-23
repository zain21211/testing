const API_BASE_URL = import.meta.env.VITE_API_URL;
import { useEffect, useCallback, useState, useRef } from "react";
import axios from "axios";

export const useInvoiceSync = (invoice, setInvoice, token) => {
  const [loading, setLoading] = useState(false);
  const isSyncing = useRef(false); // prevent overlaps

  const retryInvoices = useCallback(async () => {
    if (isSyncing.current || !invoice || invoice.length === 0) return;

    isSyncing.current = true;
    setLoading(true);

    try {
      const results = await Promise.allSettled(
        invoice.map((inv) =>
          axios.post(`${API_BASE_URL}/create-order`, inv, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      const successfulIndexes = results
        .map((res, idx) => (res.status === "fulfilled" ? idx : null))
        .filter((idx) => idx !== null);

      if (successfulIndexes.length > 0) {
        setInvoice((prev) =>
          Array.isArray(prev)
            ? prev.filter((_, idx) => !successfulIndexes.includes(idx))
            : []
        );

        console.log(
          `Synced ${successfulIndexes.length} invoice(s) successfully`
        );
        alert("Invoice synced");
      }
      setLoading(false);

    } catch (err) {
      setLoading(false);

      console.error("Retry failed:", err);
    } finally {
      console.error("finally the invoice synced");

      setLoading(false);
      isSyncing.current = false;
    }
  }, [invoice, token, setInvoice]);

  useEffect(() => {
    if (!invoice || invoice.length === 0) return;

    let interval;

    const startSync = () => {
      if (navigator.onLine) {
        interval = setInterval(retryInvoices, 5000);
      }
    };

    const stopSync = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
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
  }, [retryInvoices, invoice]);

  return { retryInvoices, loading };
};
