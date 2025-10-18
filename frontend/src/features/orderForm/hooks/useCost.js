// src/hooks/useCost.js
import { useFetch } from "./useFetch";
import { fetchCost } from "../utils/api";

export function useCost(selectedProduct) {
  return useFetch(
    "cost", // cache key
    fetchCost, // API function
    selectedProduct?.code, // param passed to fetchCost
    {
      enabled: !!selectedProduct, // only run if product is selected
      staleTime: 1000 * 60, // optional: cache for 1 min
    }
  );
}
