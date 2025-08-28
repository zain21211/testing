// src/pages/OrderPage.jsx
import React, { useState, useRef } from "react";
import ProductForm from "./components/ProductForm";
import { useFilterAutocomplete } from "./hooks/useFilter";
import { useDiscount } from "./hooks/useDiscount";
import { useCalculateAmount } from "./hooks/useCalculateAmount";
import { useScheme } from "./hooks/useScheme";
import { useProfit } from "./hooks/useProfit";
import { useCost } from "./hooks/useCost";
import { formatCurrency } from "./utils/formatCurrency"; // if you have one
import { useEffect } from "react";
import { useLocalStorageState } from "./hooks/LocalStorage";

export default function OrderPage({
    selectedCustomer,
    user,
    userType,
    products,
    onAddProduct,
    companies,
    categories
}) {
    // ------- State -------
    const [error, setError] = useState(null);
    const [productIDInput, setProductIDInput] = useLocalStorageState("productIDInput", "");
    const [companyFilter, setCompanyFilter] = useLocalStorageState("companyFilter", "");
    const [companyInputValue, setCompanyInputValue] = useLocalStorageState("companyInputValue", "");
    const [categoryFilter, setCategoryFilter] = useLocalStorageState("categoryFilter", "");
    const [categoryInputValue, setCategoryInputValue] = useLocalStorageState("categoryInputValue", "");
    const [Sch, setSch] = useLocalStorageState("Sch", true);
    const [isClaim, setIsClaim] = useLocalStorageState("isClaim", false);
    const [productInputValue, setProductInputValue] = useLocalStorageState("productInputValue", "");
    const [selectedProduct, setSelectedProduct] = useLocalStorageState("selectedProduct", null);
    const [productID, setProductID] = useLocalStorageState("productID", null);
    const [orderQuantity, setOrderQuantity] = useLocalStorageState("orderQuantity", 0);
    const [productRemakes, setProductRemakes] = useLocalStorageState("productRemakes", "");
    const [price, setPrice] = useState(selectedProduct?.SaleRate);
    const [suggestedPrice, setSuggestedPrice] = useState(0);

    // ------- Refs -------
    const productIDInputRef = useRef();
    const productInputRef = useRef();
    const quantityInputRef = useRef();

    useEffect(() => {
        setPrice(selectedProduct?.SaleRate)
        setSuggestedPrice(selectedProduct?.SaleRate)

    }, [selectedProduct])
    useEffect(() => {
        if (!productIDInput) {
            setSelectedProduct(null); // clear selection if input is empty
            setProductID(null);       // also clear productID immediately
            return;
        }

        const handler = setTimeout(() => {
            setProductID(productIDInput);
        }, 1000); // debounce delay

        return () => clearTimeout(handler); // cleanup previous timeout
    }, [productIDInput]);

    useEffect(() => {
        console.log(productInputRef?.current)
        if (selectedCustomer)
            productInputRef?.current?.focus()

    }, [selectedCustomer])

    useEffect(() => {
        if (!productInputValue) {
            setSelectedProduct(null); // clear selection if input is empty
            setProductID(null);       // also clear productID immediately
            return;
        }
    }, [productInputValue])


    useEffect(() => {
        if (selectedProduct && !productIDInput) setProductIDInput(selectedProduct.ID)
        if (!selectedProduct)
            setProductInputValue('')
    }, [selectedProduct])

    useEffect(() => {
        if (companyFilter) return;
        const userType = user?.userType?.toLowerCase();
        if (userType.includes('cust'))
            setCompanyFilter('fit');

    }, [user, setCompanyFilter, companyFilter])


    // ------- Dummy handlers -------
    const debouncedSetCompanyFilter = (val) => setCompanyFilter(val);
    const debouncedSetCategoryFilter = (val) => setCategoryFilter(val);
    const handleEnterkey = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleAddProductClick()
        }
    };

    const handleReset = () => {
        setProductIDInput('')
        setProductID('')
        setSelectedProduct(null)
        setProductInputValue('')
        setTimeout(() => {
            productInputRef.current?.focus();
        }, 0); // ensures DOM has updated


    }

    const handleAddProductClick = () => {
        console.log("Adding product:", selectedProduct);


        const newItem = {
            status: selectedProduct?.Status || "active", // Use product status, default to 'active'
            productID: selectedProduct.ID,
            name: selectedProduct.Name,
            company: selectedProduct.Company,
            model: selectedProduct.Category,
            orderQuantity: Number(orderQuantity), // The quantity the user entered
            schPc: Number(schPc) || 0, // Calculated scheme pieces
            quantity: Number(quantity) || 0, // Total quantity (order + scheme)
            rate: Number(selectedProduct?.SaleRate) ?? 0, // Product's sale rate
            suggestedPrice: Number(suggestedPrice) || 0, // User's suggested price
            vest: Number(vest) || 0, // Calculated vest
            discount1: Number(discount1) || 0, // Discount 1 percentage
            discount2: Number(discount2) || 0, // Discount 2 percentage
            amount: Number(calculatedAmount) || 0, // Final calculated numeric amount for the item
            isClaim: isClaim,
            Sch: Sch,
            profit: profit,
            remakes: productRemakes.trim(), // Add remakes
        };

        console.log("newitem", newItem)
        onAddProduct(newItem);
        handleReset();
    };

    // ------- Sizes (can move to theme or constants) -------
    const biggerInputTextSize = '1.5rem'; // For text inside input fields
    const biggerShrunkLabelSize = '0.9rem';  // For labels when they shrink (float above)
    const biggerCheckboxLabelSize = '1rem'; // For checkbox labels
    const bigger = {
        // gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
        // width: { xs: "100%", md: "120px" }, // INCREASED width
        "& .MuiInputBase-input.Mui-disabled": {
            textAlign: "center",
            fontWeight: "bold",
            WebkitTextFillColor: "black !important",
            fontSize: biggerInputTextSize,
        },
        "& .MuiInputLabel-root.Mui-disabled": {
            fontSize: biggerShrunkLabelSize,
            color: "rgba(0, 0, 0, 0.6)" // Default disabled label color
        },
        "& .MuiInputBase-input": {
            fontSize: biggerInputTextSize,
            fontWeight: 'bold'
        },
        '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            fontSize: biggerShrunkLabelSize
        },

    }

    // ------- Loading state simulation -------
    const initialDataLoading = false;
    const hasStock = selectedProduct?.StockQty > 0;
    const isAllowed = true;

    // ------- Filtered options (replace with useFilter hook later) -------
    const filteredAutocompleteOptions = useFilterAutocomplete(products, {
        companyFilter,
        categoryFilter,
        productInputValue,
        productID,
        initialDataLoading,
        setSelectedProduct,
        quantityInputRef,
    });

    // scheme
    const { schText, schPc, schOn, quantity, setSchPc, setSchOn, setQuantity, loading } =
        useScheme(selectedProduct, orderQuantity, true)

    // discount
    const { discount1, setDiscount1, discount2, setDiscount2 } = useDiscount(selectedCustomer, selectedProduct);



    // for totalamount per item
    const { vest, calculatedAmount, setCalculatedAmount } = useCalculateAmount(
        orderQuantity,
        suggestedPrice,
        discount1,
        discount2
    );

    // Cost
    const { data: cost, isLoading } = useCost(selectedProduct);

    // for profit
    const profit = useProfit({ calculatedAmount, quantity, cost });

    return (
        <ProductForm
            // Common
            error={error}
            setError={setError}
            user={user}
            profit
            userType={userType}
            products={products}
            companies={companies}
            categories={categories}
            initialDataLoading={initialDataLoading}

            // Filters
            companyFilter={companyFilter}
            companyInputValue={companyInputValue}
            setCompanyInputValue={setCompanyInputValue}
            debouncedSetCompanyFilter={debouncedSetCompanyFilter}
            categoryFilter={categoryFilter}
            categoryInputValue={categoryInputValue}
            setCategoryInputValue={setCategoryInputValue}
            debouncedSetCategoryFilter={debouncedSetCategoryFilter}

            // Product selection
            productID={productID}
            setProductID={setProductID}
            productIDInput={productIDInput}
            setProductIDInput={setProductIDInput}
            productIDInputRef={productIDInputRef}
            productInputValue={productInputValue}
            setProductInputValue={setProductInputValue}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            productInputRef={productInputRef}
            filteredAutocompleteOptions={filteredAutocompleteOptions}

            // Flags
            Sch={Sch}
            setSch={setSch}
            isClaim={isClaim}
            setIsClaim={setIsClaim}

            // Details
            orderQuantity={orderQuantity}
            setOrderQuantity={setOrderQuantity}
            quantityInputRef={quantityInputRef}
            handleEnterkey={handleEnterkey}
            schPc={schPc}
            setSchPc={setSchPc}
            quantity={quantity}
            setQuantity={setQuantity}
            schOn={schOn}
            schText={schText}
            setSchOn={setSchOn}
            price={price}
            setPrice={setPrice}
            suggestedPrice={suggestedPrice}
            setSuggestedPrice={setSuggestedPrice}
            discount1={discount1}
            setDiscount1={setDiscount1}
            discount2={discount2}
            setDiscount2={setDiscount2}
            productRemakes={productRemakes}
            setProductRemakes={setProductRemakes}
            calculatedAmount={calculatedAmount}
            formatCurrency={formatCurrency}
            hasStock={hasStock}
            isAllowed={isAllowed}
            bigger={bigger}
            biggerInputTextSize={biggerInputTextSize}
            biggerShrunkLabelSize={biggerShrunkLabelSize}
            biggerCheckboxLabelSize={biggerCheckboxLabelSize}
            handleAddProductClick={handleAddProductClick}
        />
    );
}
