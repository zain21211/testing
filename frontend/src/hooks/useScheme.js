import { useState, useEffect } from "react";
import { fetchScheme } from "../utils/api";
import { useFetch } from "./useFetch";

export function useScheme(selectedProduct, orderQuantity = 0, isScheme = false) {
    const [schPc, setSchPc] = useState(0);       // calculated free pieces
    const [schOn, setSchOn] = useState(0);       // scheme condition applied
    const [price, setPrice] = useState(selectedProduct?.SaleRate || 0);
    const [quantity, setQuantity] = useState(orderQuantity);

    const [baseSchPc, setBaseSchPc] = useState(0);
    const [baseSchOn, setBaseSchOn] = useState(0);
    const [schText, setSchText] = useState("0+0");  // "Buy X+Y"
    const [perPieceAmount, setPerPieceAmount] = useState(price);

    // fetch scheme whenever product changes (NOT when quantity changes)
    // Note: We still call this hook even if isScheme is false to maintain hook order
    const { data, isLoading, error } = useFetch(
        "scheme",
        fetchScheme,
        [
            selectedProduct?.code,
            isScheme, // Don't pass orderQuantity to API - only fetch based on product
            new Date().toISOString().split("T")[0],
        ],
        {
            enabled: !!selectedProduct?.code && isScheme, // Only fetch if scheme is enabled
        }
    );

    // When product changes: update price and reset scheme
    useEffect(() => {
        if (!selectedProduct) {
            setPrice(0);
            setSchText("0+0");
            setPerPieceAmount(0);
            setBaseSchOn(0);
            setBaseSchPc(0);
            setSchOn(0);
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        // Update price from selected product
        setPrice(selectedProduct?.SaleRate || 0);
    }, [selectedProduct, orderQuantity]);

    // When scheme data arrives: calculate price and scheme text
    useEffect(() => {
        // Skip scheme calculations if scheme is not enabled
        if (!isScheme) {
            setSchText("0+0");
            setPerPieceAmount(price);
            setBaseSchOn(0);
            setBaseSchPc(0);
            setSchOn(0);
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        if (!data) {
            setSchText("0+0");
            setPerPieceAmount(price);
            setBaseSchOn(0);
            setBaseSchPc(0);
            setSchOn(0);
            setSchPc(0);
            return;
        }

        const { SchOn = 0, SchPc = 0 } = data;

        // Store base scheme values
        setBaseSchOn(SchOn);
        setBaseSchPc(SchPc);
        setSchOn(SchOn);

        // Calculate per-piece amount for display (using current orderQuantity or default)
        const currentOrderQty = Number(orderQuantity) || (SchOn + SchPc);
        const freePcsForCalc = SchOn > 0 && currentOrderQty >= SchOn
            ? Math.floor(currentOrderQty / SchOn) * SchPc
            : 0;
        const totalQty = currentOrderQty + freePcsForCalc;

        const per = totalQty > 0 ? (price * currentOrderQty) / totalQty : price;
        setPerPieceAmount(per);

        // Set scheme text
        const text = `${SchOn}+${SchPc}(${per.toFixed(2)})`;
        setSchText(text);

        // Calculate initial free pieces based on current orderQuantity
        const initialFreePcs = SchOn > 0 && orderQuantity >= SchOn
            ? Math.floor(orderQuantity / SchOn) * SchPc
            : 0;
        setSchPc(initialFreePcs);
        setQuantity(orderQuantity + initialFreePcs);

    }, [data, price, orderQuantity, isScheme]);

    // When ONLY orderQuantity changes: recalculate free pieces (don't touch price)
    useEffect(() => {
        // Skip if scheme is not enabled
        if (!isScheme) {
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        if (!baseSchOn) {
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        // Only update free pieces based on the scheme
        const freePcs = baseSchOn > 0 && orderQuantity >= baseSchOn
            ? Math.floor(orderQuantity / baseSchOn) * baseSchPc
            : 0;

        console.log('Order Qty Changed:', orderQuantity, 'Free PCs:', freePcs);
        setSchPc(freePcs);
        setQuantity(orderQuantity + freePcs);

    }, [orderQuantity, baseSchOn, baseSchPc, isScheme]);

    useEffect(() => {
        console.log('sch and qty: ', quantity, isScheme)
    }, [quantity, isScheme])

    return {
        schPc,
        schOn,
        quantity,
        setQuantity,
        setSchPc,
        price,
        baseSchPc,
        baseSchOn,
        schText,
        perPieceAmount,
        loading: isLoading,
        error,
    };
}
