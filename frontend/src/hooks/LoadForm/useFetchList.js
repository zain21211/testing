import axios from "axios";
import { useState, useCallback } from "react";
const url = import.meta.env.VITE_API_URL;

export const useFetchList = (list = "load") => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);

  const fetchList = useCallback(async (route) => {
    // if (!transporter) {
    //   setCustomers([]);
    //   return;
    // }
    // console.log(transporter, route);
    setLoading(true);
    setError(null);

    try {
      //   const response = await fetch(`/api/customers?transporter=${transporter}`);
      const response = await axios.get(`${url}/invoices/${list}list`, {
        params: {
          // transporter,
          route,
        },
      });
      //   if (!response.ok) {
      //     throw new Error("Failed to fetch customers");
      //   }
      const data = response.data;
      const ro = [
        ...new Set(data.filter((item) => item.route).map((item) => item.route)),
      ];

      setCustomers(data);
      setRoutes(ro);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { customers, loading, error, fetchList, routes };
};
