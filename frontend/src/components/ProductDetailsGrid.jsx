// src/components/ProductDetailsGrid.jsx
import { Box, TextField, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";


export default function ProductDetailsGrid({
    selectedProduct,
    userType,
    user,
    schText,
    orderQuantity,
    setOrderQuantity,
    quantityInputRef,
    handleEnterkey,
    schPc,
    quantity,
    Sch,
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
                    md: "repeat(auto-fit, minmax(100px, 1fr))",
                },
                gap: 2,
                alignItems: "center",
            }}
        >
            {/* all your textfields + add button (same as before, just moved here) */}
            {/* Example: */}
            <Box component="form" onSubmit={handleEnterkey} noValidate autoComplete="off">
                <TextField
                    label="Qty"
                    type="number"
                    value={orderQuantity || ""}
                    inputRef={quantityInputRef}
                    onFocus={(e) => e.target.select()}
                    onKeyDown={(e) => handleEnterkey(e)}
                    inputProps={{ enterKeyHint: "done" }}
                    sx={{
                        gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
                        // width: { xs: "100%", md: "120px" },
                        backgroundColor: !isClaim && selectedProduct ? (hasStock ? "green" : "red") : undefined,
                        borderRadius: "4px", // ✅ Rounded corners

                        "& .MuiOutlinedInput-root": {
                            borderRadius: "12px", // ✅ Rounded corners for the input
                            "& fieldset": {
                                border: "none", // ✅ Remove default border/outline
                                borderColor: "transparent", // fallback
                            },
                            "&:hover fieldset": {
                                border: "none", // Remove hover border
                                borderColor: "transparent",
                            },
                            "&.Mui-focused fieldset": {
                                border: "none", // Remove focus border
                                borderColor: "transparent",
                            },
                        },

                        "& .MuiInputBase-input": {
                            color: "white !important",
                            textAlign: "center",
                            fontWeight: "bold",
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
                        "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                            fontSize: biggerShrunkLabelSize,
                            backgroundColor: 'white',
                            paddingX: 1,
                            borderRadius: 2,
                        },
                    }}

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
                <Button type="submit" style={{ display: "none" }} aria-hidden="true" />
            </Box>
            {/* ...rest of fields (FOC, TQ, Price, Discounts, Remarks, Stock, etc.) */}
            <TextField
                label="FOC"
                type="number"
                sx={bigger}
                disabled
                value={Sch ? schPc : 0}
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
                value={schText || 'NA'}
                onChange={(e) => setPrice(e.target.value)}
                sx={{
                    ...bigger,
                    "& .MuiInputBase-input": {
                        ...bigger["& .MuiInputBase-input"],
                        fontSize: "1.5rem", // override only input font size
                    },
                    "& .MuiInputBase-input.Mui-disabled": {
                        ...bigger["& .MuiInputBase-input.Mui-disabled"],
                        fontSize: "1rem", // override disabled input font size
                    },
                    "& .MuiInputLabel-root.Mui-disabled": {
                        ...bigger["& .MuiInputLabel-root.Mui-disabled"],
                        fontSize: "0.8rem", // override disabled label
                    },
                    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                        ...bigger['& .MuiInputLabel-root.MuiInputLabel-shrink'],
                        fontSize: "0.8rem", // override shrunk label
                    },
                }}
                disabled
            />
            <TextField
                label="Price"
                type="number"
                value={price}
                sx={bigger}
                onChange={(e) => setPrice(e.target.value)}
                InputLabelProps={{ shrink: true }}
                disabled
            />
            <TextField
                label="Sug.price"
                type="number"
                sx={{
                    ...bigger,
                    "& .MuiInputBase-input": {
                        ...bigger["& .MuiInputBase-input"],
                        textAlign: "right", // override only input alignment
                    },
                }}

                value={suggestedPrice}
                InputLabelProps={{ shrink: true }}
                onChange={(e) => setSuggestedPrice(e.target.value)}
                onKeyDown={(e) => handleEnterkey(e)}

            />
            <TextField
                label="D1 (%)"
                type="number"
                sx={bigger}
                value={discount1}
                onChange={(e) => setDiscount1(e.target.value)}
                onKeyDown={(e) => handleEnterkey(e)}
                disabled={!isAllowed}
            />
            <TextField
                label="D2 (%)"
                type="number"
                value={discount2}
                sx={bigger}
                onChange={(e) => setDiscount2(e.target.value)}
                onKeyDown={(e) => handleEnterkey(e)}
                disabled={!isAllowed}


            />

            <TextField
                label="Amount"
                disabled
                sx={{
                    ...bigger,
                    gridColumn: { xs: 'span 2', sm: 'span 1' },
                }}
                value={formatCurrency(calculatedAmount)}
            />

            <TextField
                label="Remakes"
                value={productRemakes}
                sx={{
                    ...bigger,
                    gridColumn: 'span 2',
                }}
                onKeyDown={(e) => handleEnterkey(e)}
                onChange={(e) => setProductRemakes(e.target.value)}
            />

            {(user.userType.toLowerCase() === "admin" ||
                user?.username?.toLowerCase() === "zain") && (
                    <TextField
                        label='Stock'
                        disabled
                        sx={bigger}
                        value={selectedProduct?.StockQty ?? 0}
                    />
                )}
            <Button
                variant="contained"
                onClick={handleAddProductClick}
                startIcon={<AddIcon />}
                sx={{
                    height: "56px",
                    display: { xs: "flex", sm: "flex", md: "none" }, // ✅ only show on mobile
                }}
            >
                Add
            </Button>

        </Box>
    );
}
