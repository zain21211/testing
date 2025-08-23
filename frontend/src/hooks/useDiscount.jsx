// src/hooks/useDiscount.js
import { useState, useEffect } from "react";
import { fetchDiscount } from "../utils/api";
import { useFetch } from "./useFetch";

export function useDiscount(selectedCustomer, selectedProduct) {
    const [discount1, setDiscount1] = useState(0);
    const [discount2, setDiscount2] = useState(0);

    const { data, isLoading, error } = useFetch(
        "discount",
        fetchDiscount,
        [selectedCustomer?.acid, selectedProduct?.Company], // params for fetchDiscount
        { enabled: !!(selectedCustomer?.acid && selectedProduct?.Company) }
    );

    // ✅ update state only when `data` changes
    useEffect(() => {
        if (data) {
            setDiscount1(data.disc1P || 0);
            setDiscount2(data.discount || 0);
        } else {
            setDiscount1(0);
            setDiscount2(0);
        }
    }, [data]);

    return {
        discount1,
        setDiscount1,
        discount2,
        setDiscount2,
        isLoading,
        error,
    };
}
