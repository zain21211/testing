import axios from "axios";
import loggingInterceptor from "./loggingInterceptor.js"; // your logging class

export default function setupAxios() {
  // Avoid duplicate registration in dev/HMR
  if (typeof window !== "undefined" && window.__axiosInterceptorsRegistered) {
    return;
  }

  // --- AUTH INTERCEPTOR ---
  const API_BASE_URL = import.meta?.env?.VITE_API_URL;
  if (API_BASE_URL && !axios.defaults.baseURL) {
    axios.defaults.baseURL = API_BASE_URL;
  }

  axios.interceptors.request.use(
    (config) => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          // Only set Authorization if not explicitly provided
          if (!config.headers?.Authorization) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (_) {}
      return config;
    },
    (error) => Promise.reject(error)
  );

  // --- LOGGING INTERCEPTORS ---
  // This will attach logging request/response interceptors
  loggingInterceptor; // Just importing the singleton sets it up

  // Flag to prevent re-registering
  if (typeof window !== "undefined") {
    window.__axiosInterceptorsRegistered = true;
  }
}
