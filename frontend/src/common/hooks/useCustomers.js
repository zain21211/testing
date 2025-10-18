import { useState, useEffect } from "react";
import axios from "axios";

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [urdu, setUrdu] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/customers")
      .then((res) => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    setAccounts(customers.map((cust) => cust.Subsidary));
    setUrdu(customers.map((cust) => cust.UrduName));
  }, []);

  return {
    customers,
    setCustomers,
    loading,
    accounts,
    urdu,
  };
}
