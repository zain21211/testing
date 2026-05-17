import { useState, useEffect } from "react";
import { fetchScheme } from "../../../utils/api";
import { useFetch } from "../../useFetch"; // adjust path if needed
import { offlineService } from "../../../services/offlineService";

export function useScheme(selectedProduct, orderQuantity = 0, isScheme = false) {
    const [schPc, setSchPc] = useState(0);       // calculated free pieces
    const [schOn, setSchOn] = useState(0);       // scheme condition applied
    const [price, setPrice] = useState(selectedProduct?.SaleRate || 0);
    const [quantity, setQuantity] = useState(orderQuantity);

    const [baseSchPc, setBaseSchPc] = useState(0);
    const [baseSchOn, setBaseSchOn] = useState(0);
    const [schText, setSchText] = useState("0+0");  // "Buy X+Y"
    const [perPieceAmount, setPerPieceAmount] = useState(price);

    // fetch scheme whenever product changes (always fetch scheme to show the textbox details!)
    const { data: serverData, isLoading, error } = useFetch(
        "scheme",
        fetchScheme,
        [
            selectedProduct?.code,
            true, // Always fetch scheme to preserve details
            new Date().toISOString().split("T")[0],
        ],
        {
            enabled: !!selectedProduct?.code,
        }
    );

    const [localData, setLocalData] = useState(null);

    useEffect(() => {
        const loadLocal = async () => {
            if (selectedProduct?.code) {
                const cached = await offlineService.getLocalScheme(selectedProduct.code);
                setLocalData(cached);
            }
        };
        loadLocal();
    }, [selectedProduct?.code]);

    const data = serverData || localData;

    // When product changes: update price
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

        setPrice(selectedProduct?.SaleRate || 0);
    }, [selectedProduct, orderQuantity]);

    // When scheme data arrives or price/orderQuantity/isScheme changes:
    useEffect(() => {
        if (!data) {
            setSchText("0+0");
            setPerPieceAmount(price);
            setBaseSchOn(0);
            setBaseSchPc(0);
            setSchOn(0);
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        const { SchOn = 0, SchPc = 0 } = data;

        // Store base scheme values
        setBaseSchOn(SchOn);
        setBaseSchPc(SchPc);
        setSchOn(SchOn);

        // Calculate per-piece amount for display (strictly using static scheme formula)
        const per = (SchOn + SchPc) > 0 ? (price * SchOn) / (SchOn + SchPc) : price;
        setPerPieceAmount(per);

        // Set scheme text (STILL set it even if isScheme is false!)
        const text = `${SchOn}+${SchPc}`;
        setSchText(text);

        // Calculate free pieces based on isScheme
        const initialFreePcs = isScheme && SchOn > 0 && orderQuantity >= SchOn
            ? Math.floor(orderQuantity / SchOn) * SchPc
            : 0;
        setSchPc(initialFreePcs);
        setQuantity(orderQuantity + initialFreePcs);

    }, [data, price, orderQuantity, isScheme]);

    // When ONLY orderQuantity or isScheme changes: recalculate free pieces (don't touch price)
    useEffect(() => {
        if (!baseSchOn) {
            setSchPc(0);
            setQuantity(orderQuantity);
            return;
        }

        // Only update free pieces based on the scheme if isScheme is true
        const freePcs = isScheme && baseSchOn > 0 && orderQuantity >= baseSchOn
            ? Math.floor(orderQuantity / baseSchOn) * baseSchPc
            : 0;

        setSchPc(freePcs);
        setQuantity(orderQuantity + freePcs);

    }, [orderQuantity, baseSchOn, baseSchPc, isScheme]);

    useEffect(() => {
        console.log('sch and qty: ', quantity, isScheme);
    }, [quantity, isScheme]);

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
