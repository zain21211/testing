import { useEffect } from 'react';
import axios from 'axios';

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

export const useInvoiceLock = (id) => {
  const handleUnlock = async (id) => {
    const unlock = `/${id}/unlock`;
    await axios.put(`${invoiceAPI}${unlock}`);
  };
  
  useEffect(() => {
    return () => {
      handleUnlock(id);
    };
  }, [id]);

  return { handleUnlock };
};