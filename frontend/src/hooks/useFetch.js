// src/hooks/useFetch.js
import { useQuery } from "@tanstack/react-query";

/**
 * Generic fetch hook using react-query
 *
 * @param {string} key - Unique cache key for react-query
 * @param {Function} apiFn - API function from api.js (e.g., fetchDiscount)
 * @param {Array|Object|undefined} params - Parameters for apiFn
 * @param {object} queryOptions - Extra react-query options (enabled, staleTime, etc.)
 */
export function useFetch(key, apiFn, params = undefined, queryOptions = {}) {
    return useQuery({
        queryKey: [key, params],   // cache key includes params
        queryFn: () => {
            // If params is object/array → spread, else pass directly
            if (params === undefined) return apiFn();
            if (Array.isArray(params)) return apiFn(...params);
            return apiFn(params);
        },
        ...queryOptions,
    });
}
