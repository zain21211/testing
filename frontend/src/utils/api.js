// src/api/api.js
import axios from "axios";

// API base URL from .env, fallback to localhost
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach token dynamically on each request
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken"); // always get fresh token
    console.log("Token", token);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ------- API Functions --------

// Fetch discounts for a customer & company
export const fetchDiscount = async (acid, company) => {
  const { data } = await client.get("/discount", { params: { acid, company } });
  return data;
};

// Fetch scheme details
export const fetchScheme = async (productCode, orderQty, date) => {
  const { data } = await client.get("/scheme", {
    params: { productCode, orderQty, date },
  });
  return data;
};

// Fetch customer balance
export const fetchBalance = async (acid) => {
  const { data } = await client.get("/balance", { params: { acid } });
  return data;
};

// Fetch overdue invoices
export const fetchOverdue = async (acid) => {
  const { data } = await client.get("/overdue", { params: { acid } });
  return data;
};

// Fetch products
export const fetchProducts = async () => {
  const { data } = await client.get("/products");
  return data;
};

// Fetch customers
export const fetchCustomers = async () => {
  const { data } = await client.get("/customers");
  return data;
};

// src/api/api.js
// src/api/api.js
export const fetchInactiveItems = async ({
  acid,
  company = "fit-o%",
  fromDate = "2024-01-01",
  days = 30,
}) => {
  const { data } = await client.get("/customers/inactive", {
    params: { acid, company, fromDate, days },
  });
  return data;
};

// Fetch cost of a product
export const fetchCost = async (code) => {
  const { data } = await client.get("/create-order/cost", {
    params: { ItemCode: code || "" },
  });
  return data;
};
