import axios from "axios";
import { useState, useCallback } from "react";
import { useLocalStorageState } from "../LocalStorage";

const url = import.meta.env.VITE_API_URL;

export const useFetchList = (list = "load") => {
  const [customers, setCustomers] = useLocalStorageState(`${list}List`, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [routes, setRoutes] = useState([]);

  const fetchList = useCallback(async (route) => {
    const user = JSON.parse(localStorage.getItem("user"));
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
          usertype: user?.userType?.toLowerCase(),
          username: user?.username?.toLowerCase(),
        },
      });
      //   if (!response.ok) {
      //     throw new Error("Failed to fetch customers");
      //   }
      const { data, status } = response;
      const ro = [
        ...new Set(data.filter((item) => item.route).map((item) => item.route)),
      ];

      if ([200, 400, 404].includes(status)) {
        console.log("this si sane", status);
        setRoutes(ro);
        setCustomers(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { customers, setCustomers, loading, error, fetchList, routes };
};
