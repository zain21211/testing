import { useState } from "react";
import axios from "axios";

export function useCreateCustomer(customers, setCustomers, resetForm) {
  const [loading, setLoading] = useState(false);

  const createCustomer = async (form) => {
    setLoading(true);
    try {
      const res = await axios.post("/api/customers", form);
      setCustomers([...customers, res.data]);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { createCustomer, loading };
}
