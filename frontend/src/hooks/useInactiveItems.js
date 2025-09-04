// src/hooks/useInactiveItems.js
import { fetchInactiveItems } from "../utils/api";
import { useFetch } from "./useFetch";

export function useInactiveItems({ acid, company = "fit-o%", fromDate = "2024-01-01", days = 30 }) {
    const { data, isLoading, error } = useFetch(
        "inactive-items",
        fetchInactiveItems,
        { acid, company, fromDate, days },
        { enabled: !!acid } // only fetch if acid exists
    );

    return {
        items: data || [],
        isLoading,
        error,
    };
}
