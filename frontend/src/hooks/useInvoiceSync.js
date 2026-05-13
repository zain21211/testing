import { useCallback, useState } from "react";
import { backgroundSyncService } from "../services/backgroundSyncService";

export const useInvoiceSync = (invoice, setInvoice, token) => {
  const [loading, setLoading] = useState(false);

  const retryInvoices = useCallback(async (isManual = false) => {
    if (!navigator.onLine) {
        if (isManual) alert("Still offline. Please check your internet connection.");
        return;
    }
    
    if (isManual) setLoading(true);
    try {
      await backgroundSyncService.syncInvoices();
      if (isManual) {
         // After sync completes, check if anything is still pending
         const current = JSON.parse(localStorage.getItem("invoice") || "[]");
         if (current.length === 0) {
            alert("All invoices synced successfully! ✅");
         } else {
            alert(`Synced some invoices. ${current.length} still pending.`);
         }
      }
    } catch (err) {
      console.error("Retry failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearInvoices = useCallback(() => {
    if (window.confirm("Are you sure you want to clear all pending invoices? This will stop the retry loop.")) {
      setInvoice([]);
    }
  }, [setInvoice]);

  return { retryInvoices: () => retryInvoices(true), clearInvoices, loading };
};
