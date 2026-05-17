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
        if (user?.userType?.toLowerCase().includes('sm')) {
            setSch(false);
        }
    }, [user, setSch])

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

        // If products haven't been synced yet, warn only after loading is complete
        if (!initialDataLoading && products.length === 0) {
            setError("Product list not available offline. Please connect to internet at least once to sync products.");
            return;
        }
        setError(null);

        const handler = setTimeout(() => {
            setProductID(productIDInput);
        }, 500); // reduced debounce delay for snappier feel

        return () => clearTimeout(handler); // cleanup previous timeout
    }, [productIDInput, products.length]);

    useEffect(() => {
        if (productID) {
            const found = products.find(p => String(p.ID) === String(productID) || String(p.code) === String(productID));
            if (found) {
                setSelectedProduct(found);
                setProductInputValue(found.Name || "");
                setError(null);
                setTimeout(() => {
                    quantityInputRef.current?.focus();
                }, 100);
            } else if (products.length > 0) {
                // Products loaded but code not found
                setSelectedProduct(null);
                setProductInputValue("");
                setError(`Product code "${productID}" not found.`);
            }
            // If products.length === 0, the other effect already shows the sync warning
        }
    }, [productID, products]);

    useEffect(() => {
        if (user?.userType?.toLowerCase().includes('sm')) {
            productIDInputRef.current?.focus();
        }
        else productInputRef.current?.focus();
    }, [selectedCustomer])

    useEffect(() => {
        if (!productInputValue) {
            setSelectedProduct(null); // clear selection if input is empty
            setProductID(null);       // also clear productID immediately
            setProductIDInput('');
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

    useEffect(() => {
        setSelectedProduct(null)
        setProductID(null)
        setProductIDInput('')

    }, [companyFilter, categoryFilter])

    useEffect(() => {
        if (!productInputValue)
            setSelectedProduct(null)
    }, [productInputValue])

    useEffect(() => {
        if (Sch) return;

        setQuantity(orderQuantity);
        setSchPc(0)

    }, [Sch])

    // ------- Dummy handlers -------
    const debouncedSetCompanyFilter = (val) => setCompanyFilter(val);
    const debouncedSetCategoryFilter = (val) => setCategoryFilter(val);
    const handleEnterkey = (e) => {
        e.preventDefault();
        if (e.type === "submit" || e.key === "Enter" || e.code === "NumpadEnter") {
            handleAddProductClick();
        }
    };

    const handleReset = () => {
        setProductIDInput('')
        setProductID('')
        setSelectedProduct(null)
        setProductInputValue('')
        setTimeout(() => {
            if (user?.userType?.toLowerCase().includes('sm')) {
                productIDInputRef.current?.focus();
            }
            else productInputRef.current?.focus();
        }, 50); // ensures DOM has updated


    }

    const handleAddProductClick = () => {
        console.log("Adding product:", selectedProduct);
        const finalDiscount1 = Number(discount1) || 0;
        let finalDiscount2 = Number(discount2) || 0;
        const finalQty = Number(orderQuantity) || 0;
        const sugPriceVal = Number(suggestedPrice) || 0;
        const purchaseRate = Number(selectedProduct?.PurchaseRate) || 0;

        const isPrivileged = user?.userType?.toLowerCase().includes("admin") || 
                             user?.userType?.toLowerCase() === "sm-kr" || 
                             user?.username?.toLowerCase() === "zain";

        let appliedRate = Number(selectedProduct?.SaleRate) || 0;
        if (isPrivileged) {
            if (sugPriceVal >= purchaseRate) {
                appliedRate = sugPriceVal;
            }
        }

        const gross = finalQty * appliedRate;
        const totalDiscount = (finalDiscount1 + finalDiscount2) / 100;
        let finalAmount = gross - gross * totalDiscount;

        if (selectedProduct?.Name?.toLowerCase().includes('publicity') && finalQty < 10) {
            finalDiscount2 = 100;
            finalAmount = 0;
        }

        const totalQty = Boolean(Sch) ? Number(quantity) || 0 : finalQty;
        const costValue = cost?.cost || 0;
        let finalProfit = 0;
        if (costValue && totalQty) {
            finalProfit = Math.round(((finalAmount || 0) / (totalQty || 0) - costValue) * (totalQty || 0));
        }

        const newItem = {
            status: selectedProduct?.Status || "active", // Use product status, default to 'active'
            productID: selectedProduct.ID,
            name: selectedProduct.Name,
            company: selectedProduct.Company,
            model: selectedProduct.Category,
            orderQuantity: finalQty, // The quantity the user entered
            schPc: Number(schPc) || 0, // Calculated scheme pieces
            quantity: totalQty, // Total quantity (order + scheme)
            rate: appliedRate, // Product's sale rate or suggested rate (if allowed)
            suggestedPrice: sugPriceVal, // User's suggested price
            vest: gross, // Calculated vest using appliedRate
            discount1: finalDiscount1, // Discount 1 percentage
            discount2: finalDiscount2, // Discount 2 percentage
            amount: Number(finalAmount) || 0, // Final calculated numeric amount for the item
            isClaim: isClaim,
            Sch: Sch,
            profit: finalProfit,
            remakes: productRemakes.trim(), // Add remakes
        };

        console.log("newitem", newItem)
        onAddProduct(newItem);
        handleReset();
    };

    // ------- Sizes (can move to theme or constants) -------
    const biggerInputTextSize = '1.4rem'; // For text inside input fields
    const biggerShrunkLabelSize = '0.9rem';  // For labels when they shrink (float above)
    const biggerCheckboxLabelSize = '1rem'; // For checkbox labels
    const bigger = {
        // gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
        // width: { xs: "100%", md: "120px" }, // INCREASED width
        "& .MuiInputBase-input.Mui-disabled": {
            textAlign: "center",
            fontWeight: "bold",
            fontFamily: "'Poppins', sans-serif",
            WebkitTextFillColor: "black !important",
            fontSize: biggerInputTextSize,
            "&::-webkit-outer-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
            },
            "&::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
            },
            "&[type=number]": {
                MozAppearance: "textfield", // Firefox
            },
        },
        "& .MuiInputLabel-root.Mui-disabled": {
            fontSize: biggerShrunkLabelSize,
            fontFamily: "'Poppins', sans-serif",
            color: "rgba(0, 0, 0, 0.6)" // Default disabled label color
        },
        "& .MuiInputBase-input": {
            fontSize: biggerInputTextSize,
            fontWeight: 'bold',
            fontFamily: "'Poppins', sans-serif",
            // fontFamily: "'Roboto Mono', monospace",
            "&::-webkit-outer-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
            },
            "&::-webkit-inner-spin-button": {
                WebkitAppearance: "none",
                margin: 0,
            },
            "&[type=number]": {
                MozAppearance: "textfield", // Firefox
            },
        },
        '& .MuiInputLabel-root.MuiInputLabel-shrink': {
            fontSize: biggerShrunkLabelSize
        },

    }

    // ------- Loading state simulation -------
    const initialDataLoading = false;
    const hasStock = selectedProduct?.StockQty >= orderQuantity;
    const isAllowed = !user.userType.toLowerCase().includes('spo');

    const filteredAutocompleteOptions = useFilterAutocomplete(products, {
        companyFilter,
        categoryFilter,
        productInputValue,
        productID,
        initialDataLoading,
    });

    // scheme
    const { schText = '0+0', schPc, schOn, quantity, setSchPc, setSchOn, setQuantity, loading, perPieceAmount } =
        useScheme(selectedProduct, orderQuantity, Sch)

    // discount
    const { discount1, setDiscount1, discount2, setDiscount2 } = useDiscount(selectedCustomer, selectedProduct);

    // Calculate appliedRate based on user type & PurchaseRate check
    const isPrivilegedUser = user?.userType?.toLowerCase().includes("admin") || 
                             user?.userType?.toLowerCase() === "sm-kr" || 
                             user?.username?.toLowerCase() === "zain";
    const selectedProdPurchaseRate = Number(selectedProduct?.PurchaseRate) || 0;
    const suggestedPriceVal = Number(suggestedPrice) || 0;

    let currentAppliedRate = Number(selectedProduct?.SaleRate) || 0;
    if (isPrivilegedUser) {
        if (suggestedPriceVal >= selectedProdPurchaseRate) {
            currentAppliedRate = suggestedPriceVal;
        }
    }

    // for totalamount per item
    const { vest, calculatedAmount, setCalculatedAmount } = useCalculateAmount(
        orderQuantity,
        currentAppliedRate,
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
            schText={schText || '0+0'}
            setSchOn={setSchOn}
            perPieceAmount={perPieceAmount}
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
