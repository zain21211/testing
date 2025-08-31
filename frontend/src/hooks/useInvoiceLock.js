import { useEffect, useRef } from "react";
import axios from "axios";

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

export const useInvoiceLock = (id) => {
  const unlockedRef = useRef(false);

  const handleUnlock = async (invoiceId) => {
    if (!invoiceId || unlockedRef.current) return;
    unlockedRef.current = true;
    try {
      await axios.put(`${invoiceAPI}/${invoiceId}/unlock`);
      console.log(`Invoice ${invoiceId} unlocked`);
    } catch (err) {
      console.error("Error unlocking invoice:", err);
    }
  };

  // Unlock whenever this page unmounts (back, forward, or going elsewhere)
  useEffect(() => {
    return () => {
      handleUnlock(id);
    };
  }, [id]);

  return { handleUnlock };
};
