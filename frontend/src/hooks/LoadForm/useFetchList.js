import axios from "axios";
import { useState, useCallback } from "react";
import { useLocalStorageState } from "../LocalStorage";

const url = import.meta.env.VITE_API_URL;

export const useFetchList = (list = "load") => {
  const [customers, setCustomers] = useLocalStorageState(`${list}List`, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [routes, setRoutes] = useState([]);

  const fetchList = useCallback(async (filters = {}, page = 1, limit = 50) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const { route, acid, doc, dateSort = 'DESC', docSort = '' } = typeof filters === 'string' ? { route: filters } : filters;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${url}/invoices/${list}list`, {
        params: {
          route,
          acid,
          doc,
          page,
          limit,
          usertype: user?.userType?.toLowerCase(),
          username: user?.username?.toLowerCase(),
        },
      });

      const { data: resData, status } = response;
      
      // Handle the new paginated response format or the old one for backward compatibility
      let data = resData.data || resData;
      const total = resData.total || data.length;

      // Pure Frontend Sorting
      data = [...data].sort((a, b) => {
          if (docSort) {
              return docSort === 'ASC' ? (a.doc || 0) - (b.doc || 0) : (b.doc || 0) - (a.doc || 0);
          }
          
          const dateA = new Date(a.date || a.LastDate || 0).getTime();
          const dateB = new Date(b.date || b.LastDate || 0).getTime();
          
          if (dateA === dateB) {
              // Secondary sort by doc if dates tie
              return dateSort === 'ASC' ? (a.doc || 0) - (b.doc || 0) : (b.doc || 0) - (a.doc || 0);
          }
          return dateSort === 'ASC' ? dateA - dateB : dateB - dateA;
      });

      const ro = [
        ...new Set(data.filter((item) => item.route).map((item) => item.route)),
      ];

      if ([200, 400, 404].includes(status)) {
        console.log("this si sane", status);
        setRoutes(ro);
        setCustomers(data);
        setTotalRecords(total);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { customers, setCustomers, loading, error, fetchList, routes, totalRecords };
};
