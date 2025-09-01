const API_BASE_URL = import.meta.env.VITE_API_URL;
import { useEffect, useCallback } from "react";
import axios from "axios";

export const useInvoiceSync = (invoice, setInvoice, token) => {
  // Retry function
  const retryInvoices = useCallback(async () => {
    if (invoice.length === 0) return;

    // const invoices = [invoice];
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
        alert("invoice synced");
      }
    } catch (err) {
      console.error("Retry failed:", err);
    }
  }, [invoice, token, setInvoice]);

  // Automatic retries
  useEffect(() => {
    const interval = setInterval(retryInvoices, 5000);
    window.addEventListener("online", retryInvoices);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", retryInvoices);
    };
  }, [retryInvoices]);

  // Return the retry function for manual triggering
  return { retryInvoices };
};
