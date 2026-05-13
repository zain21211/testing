import localforage from "localforage";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Database instances
// Note: CustomerData.js configures the default localforage instance to name: "CustomerDB", storeName: "customers"
// We use createInstance to be explicit, but point to the same underlying storage.
const customersStore = localforage.createInstance({ name: "CustomerDB", storeName: "customers" });
const productsStore = localforage.createInstance({ name: "CustomerDB", storeName: "customers" }); 
const schemesStore = localforage.createInstance({ name: "CustomerDB", storeName: "customers" });
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

  getLastUsername: async () => {
    const lastUser = await authStore.getItem("lastUser");
    return lastUser?.username || null;
  },

  // --- CUSTOMERS ---
  syncCustomers: async (token) => {
    if (!navigator.onLine) return;
    try {
      const res = await axios.get(`${API_URL}/search/coa`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(res.data)) {
        await customersStore.setItem("masterCustomerList", res.data);
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: "masterCustomerList" } }));
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
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: "products" } }));
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
        window.dispatchEvent(new CustomEvent('indexeddb-change', { detail: { key: "schemes_map" } }));
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
  },

  // --- PACKING LIST (Pending Orders) ---
  syncPackingData: async () => {
    if (!navigator.onLine) return;
    try {
      const res = await axios.get(`${API_URL}/sales-report`, {
        params: { invoiceStatus: "estimate", page: "pack" },
        timeout: 8000,
      });
      if (Array.isArray(res.data)) {
        // Use the same key that PackingList.jsx uses for localStorage
        localStorage.setItem("pendingTableData", JSON.stringify(res.data));
        await authStore.setItem("lastPackingSync", new Date().toISOString());
      }
    } catch (e) {
      console.error("Packing sync failed:", e);
    }
  },

  // --- DASHBOARD TOTALS ---
  saveDashboardTotals: (totals) => {
    try {
      localStorage.setItem("cached_dashboard_totals", JSON.stringify({
        ...totals,
        cachedAt: new Date().toISOString(),
      }));
    } catch (e) {}
  },

  getCachedDashboardTotals: () => {
    try {
      const raw = localStorage.getItem("cached_dashboard_totals");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
};
