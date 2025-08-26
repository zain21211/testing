import { useState, useEffect } from "react";
import { fetchScheme } from "../utils/api";
import { useFetch } from "./useFetch";

export function useScheme(selectedProduct, orderQuantity = 0) {
    const [schPc, setSchPc] = useState(0);       // calculated free pieces
    const [schOn, setSchOn] = useState(0);       // scheme condition applied
    const [price, setPrice] = useState(selectedProduct?.SaleRate || 0);
    const [quantity, setQuantity] = useState(orderQuantity);

    const [baseSchPc, setBaseSchPc] = useState(0);
    const [baseSchOn, setBaseSchOn] = useState(0);
    const [schText, setSchText] = useState("");  // "Buy X+Y"
    const [perPieceAmount, setPerPieceAmount] = useState(price);

    // fetch scheme whenever product changes
    const { data, isLoading, error } = useFetch(
        "scheme",
        fetchScheme,
        [
            selectedProduct?.code,
            Number(orderQuantity) || null,
            new Date().toISOString().split("T")[0],
        ],
        {
            enabled: !!selectedProduct?.code,
        }
    );

    // update price when product changes
    useEffect(() => {
        setPrice(selectedProduct?.SaleRate || 0);
    }, [selectedProduct]);

    // calculate scheme text and per-piece amount immediately when scheme data is available
    useEffect(() => {
        if (!data) {
            setSchText("");
            setPerPieceAmount(price);
            setBaseSchOn(0);
            setBaseSchPc(0);
            return;
        }

        const { SchOn = 0, SchPc = 0 } = data;

        // base scheme
        setBaseSchOn(SchOn);
        setBaseSchPc(SchPc);


        // per-piece amount with current order quantity (0 if not entered yet)
        const currentOrderQty = Number(orderQuantity) || (SchOn + SchPc);
        const totalQty = currentOrderQty + (SchOn > 0 && currentOrderQty >= SchOn
            ? Math.floor(currentOrderQty / SchOn) * SchPc
            : 0);


        const per = totalQty > 0 ? (price * currentOrderQty) / totalQty : price
        // scheme text
        const text = `${SchOn}+${SchPc}(${per})`;
        if (text !== schText)
            setSchText(text);

    }, [data, price]);

    // calculate free pieces and total quantity whenever orderQuantity changes
    useEffect(() => {
        if (!data) {
            setSchPc(0);
            setSchOn(0);
            setQuantity(orderQuantity);
            return;
        }

        const { SchOn = 0, SchPc = 0 } = data;
        const currentOrderQty = Number(orderQuantity) || 0;

        const freePcs = SchOn > 0 && currentOrderQty >= SchOn
            ? Math.floor(currentOrderQty / SchOn) * SchPc
            : 0;

        setSchOn(SchOn);
        setSchPc(freePcs);
        setQuantity(currentOrderQty + freePcs);
    }, [data, orderQuantity]);

    return {
        schPc,
        schOn,
        quantity,
        price,
        baseSchPc,
        baseSchOn,
        schText,
        perPieceAmount,
        loading: isLoading,
        error,
    };
}
