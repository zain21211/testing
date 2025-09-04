import { useEffect, useRef } from "react";
import axios from "axios";

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

export const useInvoiceLock = (id) => {
  const unlockedRef = useRef(false);

  const handleUnlock = async () => {
    console.log("handleunclock");

    if (!id || unlockedRef.current) return;
    unlockedRef.current = true;
    try {
      await axios.post(`${invoiceAPI}/${id}/unlock`);
    } catch (err) {
      console.error("Error unlocking invoice:", err);
    }
  };

  useEffect(() => {
    if (!id) return;
    unlockedRef.current = false;

    // window.addEventListener("beforeunload", handleUnlock);
    window.addEventListener("pagehide", handleUnlock);

    return () => {
      window.removeEventListener("pagehide", handleUnlock);
      handleUnlock(); // unlock on normal unmount
    };
  }, [id]);

  return { handleUnlock };
};
