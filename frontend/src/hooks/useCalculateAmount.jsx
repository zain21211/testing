// src/hooks/useCalculateAmount.js
import { useState, useEffect } from "react";

export function useCalculateAmount(orderQuantity, price, discount1, discount2) {
    const [vest, setVest] = useState(0);                // Gross amount before discount
    const [calculatedAmount, setCalculatedAmount] = useState(0); // Net amount after discount

    useEffect(() => {
        const qty = Number(orderQuantity) || 0;
        const rate = Number(price) || 0;
        const d1 = Number(discount1) || 0;
        const d2 = Number(discount2) || 0;

        const gross = qty * rate;
        const totalDiscount = (d1 + d2) / 100;
        const final = gross - gross * totalDiscount;

        setVest(gross);
        setCalculatedAmount(final);
    }, [orderQuantity, price, discount1, discount2]);

    return { vest, calculatedAmount, setCalculatedAmount };
}
