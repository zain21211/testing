// src/hooks/useScheme.js
import { useState, useEffect } from "react";
import { fetchScheme } from "../utils/api";
import { useFetch } from "./useFetch";

export function useScheme(selectedProduct, orderQuantity, enabled = true) {
    const [schPc, setSchPc] = useState(0);       // free pieces
    const [schOn, setSchOn] = useState(0);       // scheme condition
    const [quantity, setQuantity] = useState(orderQuantity || 0);

    const { data, isLoading, error } = useFetch(
        "scheme",
        fetchScheme,
        [
            selectedProduct?.code,
            Number(orderQuantity),
            new Date().toISOString().split("T")[0], // current date
        ],
        {
            enabled:
                enabled && !!selectedProduct?.code && Number(orderQuantity) > 0,
        }
    );

    useEffect(() => {
        const currentOrderQty = Number(orderQuantity) || 0;

        if (!data) {
            setSchPc(0);
            setSchOn(0);
            setQuantity(currentOrderQty);
            return;
        }

        const { SchOn = 0, SchPc = 0 } = data;
        const pcs =
            SchOn > 0
                ? Math.floor(currentOrderQty / Number(SchOn)) * Number(SchPc)
                : 0;

        setSchOn(SchOn);
        setSchPc(pcs);
        setQuantity(currentOrderQty + pcs);
    }, [data, orderQuantity]);

    return {
        schPc,
        setSchPc,
        schOn,
        setSchOn,
        quantity,
        setQuantity,
        loading: isLoading,
        error,
    };
}
