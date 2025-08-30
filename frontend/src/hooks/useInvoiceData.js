import { useState, useEffect } from "react";
import axios from "axios";

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

export const useInvoiceData = (id) => {
  const [invoice, setInvoice] = useState({ items: [] });
  const [customer, setCustomer] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getInvoice = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${invoiceAPI}/${id}`, {
          params: { user: user.username, type: user.userType, page: "pack" },
        });
        setInvoice(response.data);
        setCustomer(response.data.Customer);
        setProducts(response.data.Products);
      } catch (error) {
        console.error("Error fetching invoice:", error);
      } finally {
        setLoading(false);
      }
    };
    getInvoice();
  }, [id]);

  return { invoice, customer, products, loading };
};
