import localforage from "localforage";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Database instances
const customersStore = localforage.createInstance({ name: "CustomerDB", storeName: "customers" });
const productsStore = localforage.createInstance({ name: "localforage", storeName: "keyvaluepairs" }); // Default
const schemesStore = localforage.createInstance({ name: "localforage", storeName: "keyvaluepairs" });
const authStore = localforage.createInstance({ name: "offlineDB", storeName: "auth" });

export const offlineService = {
  // --- AUTH ---
  saveCredentials: async (username, password) => {
    const hash = btoa(username + ":" + password); 
    await authStore.setItem("lastUser", { username, hash });
  },

  verifyCredentials: async (username, password) => {
    const lastUser = await authStore.getItem("lastUser");
    if (!lastUser) return false;
    const currentHash = btoa(username + ":" + password);
    return lastUser.username === username && lastUser.hash === currentHash;
  },

  // --- CUSTOMERS ---
  syncCustomers: async (token) => {
    if (!navigator.onLine) return;
    try {
      const res = await axios.get(`${API_URL}/search/coa`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        // Match masterCustomerList key used in useCustomerSearch
        await customersStore.setItem("masterCustomerList", res.data);
        await authStore.setItem("lastCustomerSync", new Date().toISOString());
        return res.data;
      }
    } catch (e) {
      console.error("Customer sync failed:", e);
    }
  },

  getLocalCustomers: async () => {
    return (await customersStore.getItem("masterCustomerList")) || [];
  },

  // --- PRODUCTS ---
  syncProducts: async (token) => {
    if (!navigator.onLine) return;
    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        await productsStore.setItem("products", res.data);
        await authStore.setItem("lastProductSync", new Date().toISOString());
        return res.data;
      }
    } catch (e) {
      console.error("Product sync failed:", e);
    }
  },

  getLocalProducts: async () => {
    return (await productsStore.getItem("products")) || [];
  },

  // --- SCHEMES ---
  syncSchemes: async (token) => {
    if (!navigator.onLine) return;
    try {
      const res = await axios.get(`${API_URL}/create-order/schemes/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        const schemeMap = {};
        res.data.forEach(s => {
            if (s.code) schemeMap[s.code] = s;
        });
        await schemesStore.setItem("schemes_map", schemeMap);
        await authStore.setItem("lastSchemeSync", new Date().toISOString());
        return schemeMap;
      }
    } catch (e) {
      console.error("Scheme sync failed:", e);
    }
  },

  getLocalScheme: async (productCode) => {
    const map = await schemesStore.getItem("schemes_map") || {};
    return map[productCode] || null;
  }
};
