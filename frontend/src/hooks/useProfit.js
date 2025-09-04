// src/hooks/useProfit.js
import { useState, useEffect } from "react";

export function useProfit({ calculatedAmount, quantity, cost }) {
    const [profit, setProfit] = useState(0);

    useEffect(() => {
        if (cost && quantity) {
            const net_profit =
                ((calculatedAmount || 0) / (quantity || 0) - cost.cost) * (quantity || 0);

            setProfit(Math.round(net_profit));
        } else {
            setProfit(0);
        }
    }, [calculatedAmount, quantity, cost]);

    return profit;
}
