const API_BASE_URL = import.meta.env.VITE_API_URL;
import { useEffect, useCallback, useState, useRef } from "react";
import axios from "axios";

export const useInvoiceSync = (invoice, setInvoice, token) => {
  const [loading, setLoading] = useState(false);
  const isSyncing = useRef(false); // prevent overlaps

  const retryInvoices = useCallback(async (isManual = false) => {
    if (isSyncing.current || !invoice || invoice.length === 0) return;

    isSyncing.current = true;
    if (isManual) setLoading(true);

    try {
      const results = await Promise.allSettled(
        invoice.map((inv) =>
          axios.post(`${API_BASE_URL}/create-order`, inv, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      const successfulIndexes = results
        .map((res, idx) => {
          if (res.status === "fulfilled") {
            // Treat 200, 201, and 204 (duplicate) as success
            const status = res.value.status;
            if (status === 200 || status === 201 || status === 204) {
              return idx;
            }
          }
          return null;
        })
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
        if (isManual) alert("Invoice synced successfully!");
      }
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setLoading(false);
      isSyncing.current = false;
    }
  }, [invoice, token, setInvoice]);

  const clearInvoices = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all pending invoices? This will stop the retry loop.")) {
      setInvoice([]);
    }
  }, [setInvoice]);

  useEffect(() => {
    if (!invoice || invoice.length === 0) return;

    let interval;

    const startSync = () => {
      if (navigator.onLine) {
        // Auto-sync every 60 seconds
        interval = setInterval(() => retryInvoices(false), 60000);
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

  return { retryInvoices: () => retryInvoices(true), clearInvoices, loading };
};
