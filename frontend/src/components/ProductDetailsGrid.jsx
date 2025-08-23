// src/components/ProductDetailsGrid.jsx
import { Box, TextField, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

export default function ProductDetailsGrid({
    selectedProduct,
    userType,
    user,
    orderQuantity,
    setOrderQuantity,
    quantityInputRef,
    handleEnterkey,
    schPc,
    quantity,
    schOn,
    setPrice,
    price,
    suggestedPrice,
    setSuggestedPrice,
    discount1,
    setDiscount1,
    discount2,
    setDiscount2,
    calculatedAmount,
    formatCurrency,
    productRemakes,
    setProductRemakes,
    isClaim,
    hasStock,
    bigger,
    biggerInputTextSize,
    biggerShrunkLabelSize,
    initialDataLoading,
    isAllowed,
    handleAddProductClick,
}) {
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(4, 1fr)",
                    sm: "repeat(4, 1fr)",
                    md: "repeat(auto-fit, minmax(110px, 1fr))",
                },
                gap: 2,
                alignItems: "center",
            }}
        >
            {/* all your textfields + add button (same as before, just moved here) */}
            {/* Example: */}
            <TextField
                label="Qty"
                type="number"
                value={orderQuantity || ""}
                inputRef={quantityInputRef}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => handleEnterkey(e)}
                onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === "-") {
                        setOrderQuantity(value);
                    } else {
                        const parsed = parseInt(value, 10);
                        if (!isNaN(parsed)) setOrderQuantity(parsed);
                    }
                }}
                disabled={initialDataLoading || !selectedProduct}
            />

            {/* ...rest of fields (FOC, TQ, Price, Discounts, Remarks, Stock, etc.) */}
            <TextField
                label="FOC"
                type="number"
                sx={bigger}
                disabled
                value={schPc}
            />
            <TextField
                label="TQ"
                sx={bigger}
                type="number"
                disabled
                value={quantity}
            />
            <TextField
                label="Scheme"
                type="text"
                value={schOn}
                onChange={(e) => setPrice(e.target.value)}
                sx={bigger}
                disabled={!isAllowed}
            />
            <TextField
                label="Price"
                type="number"
                value={price}
                sx={bigger}
                onChange={(e) => setPrice(e.target.value)}
                disabled={!isAllowed}
            />
            <TextField
                label="Sug.price"
                type="number"
                sx={bigger}
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(e.target.value)}
            />
            <TextField
                label="D1 (%)"
                type="number"
                sx={bigger}
                value={discount1}
                onChange={(e) => setDiscount1(e.target.value)}
            />
            <TextField
                label="D2 (%)"
                type="number"
                value={discount2}
                sx={bigger}
                onChange={(e) => setDiscount2(e.target.value)}
            />
            <TextField
                label="Amount"
                disabled
                sx={bigger}
                value={formatCurrency(calculatedAmount)}
            />
            <TextField
                label="Remakes"
                value={productRemakes}
                sx={bigger}
                onChange={(e) => setProductRemakes(e.target.value)}
                sx={{ gridColumn: { xs: "span 2", sm: "span 2", md: "span 2" } }}
            />
            {(userType === "admin" ||
                user?.username?.toLowerCase() === "zain") && (
                    <TextField
                        label="Stock"
                        disabled
                        sx={bigger}
                        value={selectedProduct?.StockQty ?? 0}
                    />
                )}
            <Button
                variant="contained"
                onClick={handleAddProductClick}
                startIcon={<AddIcon />}
                sx={{ height: "56px" }}
            >
                Add
            </Button>
        </Box>
    );
}
