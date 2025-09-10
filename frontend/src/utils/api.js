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

export const fetchDiscountAll = async (acid) => {
  const { data } = await client.get("/discount", { params: { acid } });
  return data;
};

// Fetch scheme details
export const fetchScheme = async (productCode, orderQty, date) => {
  const { data } = await client.get("/scheme/all", {
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
  console.log("all customers: ", data);
  return data;
};

export const fetchDebitCustomers = async () => {
  const { data } = await client.get("/customers/debit", {
    params: { username: JSON.parse(localStorage.getItem("user"))?.username },
  });
  console.log("debit: ", data);
  return data;
};

export const fetchCreditCustomers = async () => {
  const { data } = await client.get("/customers/credit", {
    params: { username: JSON.parse(localStorage.getItem("user"))?.username },
  });
  console.log("credit: ", data);
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

export const fetchApiLogs = async () => {
  try {
    const res = await client.get(`/logs/api`);

    return [res.data.data];
  } catch (error) {
    console.error("Error fetching API logs:", error);
    throw error;
  }
};

// Create or Update customer
export const saveCustomer = async (selectedCustomer, finalFormData, images) => {
  try {
    if (!selectedCustomer || Object.keys(selectedCustomer).length === 0) {
      const [customerRes, imageRes] = await Promise.all([
        client.post("/customers/create", finalFormData),
        client.post("/customers/createImages", {
          ...images,
          acid: finalFormData.acid, // assuming acid comes from formData
        }),
      ]);

      return { customer: customerRes.data, images: imageRes.data };
    } else {
      console.log(
        "Updating customer with data:",
        finalFormData,
        "and images:",
        images,
        selectedCustomer || "No selected customer"
      );

      const [customerRes, imageRes] = await Promise.all([
        client.put("/customers/update", finalFormData),
        client.put("/customers/updateImages", {
          ...images,
          acid: selectedCustomer.acid,
        }),
      ]);

      return { customer: customerRes.data, images: imageRes.data };
    }
  } catch (error) {
    console.error("Error saving customer:", error);
    throw error;
  }
};
