// src/features/orderForm/components/ProductDetailsGrid.jsx
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
    perPieceAmount, // calculated per-piece rate under scheme
}) {

    return (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            
            {/* ROW 1: QTY, FOC, TQ, Rate */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 2,
                    alignItems: "center",
                }}
            >
                <Box component="form" onSubmit={handleEnterkey} noValidate autoComplete="off" sx={{ width: "100%" }}>
                    <TextField
                        label="Qty"
                        type="number"
                        fullWidth
                        value={orderQuantity || ""}
                        inputRef={quantityInputRef}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                            if (
                                e.key === "Enter" || 
                                e.key === "Tab" || 
                                e.code === "NumpadEnter"
                            ) {
                                e.preventDefault();
                                handleAddProductClick();
                            }
                        }}
                        inputProps={{ enterKeyHint: "done" }}
                        sx={{
                            backgroundColor: !isClaim && selectedProduct ? (hasStock ? "green" : "red") : undefined,
                            borderRadius: "4px",

                            "& .MuiOutlinedInput-root": {
                                borderRadius: "12px",
                                "& fieldset": {
                                    border: "none",
                                    borderColor: "transparent",
                                },
                                "&:hover fieldset": {
                                    border: "none",
                                    borderColor: "transparent",
                                },
                                "&.Mui-focused fieldset": {
                                    border: "none",
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
                                    MozAppearance: "textfield",
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

                <TextField
                    label="FOC"
                    type="number"
                    sx={{ ...bigger, width: "100%" }}
                    disabled
                    value={Sch ? schPc : 0}
                />

                <TextField
                    label="TQ"
                    type="number"
                    sx={{ ...bigger, width: "100%" }}
                    disabled
                    value={quantity}
                />

                <TextField
                    label="Rate"
                    type="number"
                    value={price}
                    sx={{ ...bigger, width: "100%" }}
                    disabled
                    InputLabelProps={{ shrink: true }}
                />
            </Box>

            {/* ROW 2: Scheme, Scheme Rate, Sugg. Rate */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 2,
                    alignItems: "center",
                }}
            >
                <TextField
                    label="Scheme"
                    type="text"
                    value={schText || 'NA'}
                    sx={{
                        ...bigger,
                        width: "100%",
                        "& .MuiInputBase-input": {
                            ...bigger["& .MuiInputBase-input"],
                            fontSize: "1.5rem",
                        },
                        "& .MuiInputBase-input.Mui-disabled": {
                            ...bigger["& .MuiInputBase-input.Mui-disabled"],
                            fontSize: "1rem",
                        },
                        "& .MuiInputLabel-root.Mui-disabled": {
                            ...bigger["& .MuiInputLabel-root.Mui-disabled"],
                            fontSize: "0.8rem",
                        },
                        "& .MuiInputLabel-root.MuiInputLabel-shrink": {
                            ...bigger['& .MuiInputLabel-root.MuiInputLabel-shrink'],
                            fontSize: "0.8rem",
                        },
                    }}
                    disabled
                />

                <TextField
                    label="Scheme Rate"
                    type="text"
                    sx={{ ...bigger, width: "100%" }}
                    disabled
                    value={perPieceAmount ? formatCurrency(perPieceAmount) : "0"}
                />

                <Box component="form" onSubmit={handleEnterkey} noValidate autoComplete="off" sx={{ width: "100%" }}>
                    <TextField
                        label="Sugg. Rate"
                        type="number"
                        onFocus={e => e.target.select()}
                        sx={{
                            ...bigger,
                            width: "100%",
                            backgroundColor: "#fffde7", // Pleasant light yellow background
                            borderRadius: "12px", // Ensure border radius matches premium look
                            "& .MuiInputBase-input": {
                                ...bigger["& .MuiInputBase-input"],
                                textAlign: "right",
                            },
                        }}
                        value={suggestedPrice}
                        InputLabelProps={{ shrink: true }}
                        onChange={(e) => setSuggestedPrice(e.target.value)}
                        onKeyDown={(e) => {
                            if (
                                e.key === "Enter" || 
                                e.key === "Tab" || 
                                e.code === "NumpadEnter"
                            ) {
                                e.preventDefault();
                                handleAddProductClick();
                            }
                        }}
                    />
                    <Button type="submit" style={{ display: "none" }} aria-hidden="true" />
                </Box>
            </Box>

            {/* ROW 3: D1, D2, Amount, Remakes, Stock, Mobile Add Button */}
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(4, 1fr)",
                        md: "repeat(6, 1fr)",
                    },
                    gap: 2,
                    alignItems: "center",
                }}
            >
                <TextField
                    label="D1 (%)"
                    type="number"
                    sx={{
                        ...bigger,
                        gridColumn: { xs: "span 1", md: "span 1" }
                    }}
                    value={discount1}
                    onChange={(e) => setDiscount1(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProductClick();
                        }
                    }}
                    disabled={!isAllowed}
                />

                <TextField
                    label="D2 (%)"
                    type="number"
                    value={discount2}
                    sx={{
                        ...bigger,
                        gridColumn: { xs: "span 1", md: "span 1" }
                    }}
                    onChange={(e) => setDiscount2(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProductClick();
                        }
                    }}
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
                        gridColumn: { xs: 'span 4', md: 'span 2' },
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddProductClick();
                        }
                    }}
                    onChange={(e) => setProductRemakes(e.target.value)}
                />

                {(user?.userType?.toLowerCase() === "admin" ||
                    user?.username?.toLowerCase() === "zain") ? (
                        <TextField
                            label='Stock'
                            disabled
                            sx={{
                                ...bigger,
                                gridColumn: { xs: 'span 2', md: 'span 1' },
                            }}
                            value={selectedProduct?.StockQty ?? 0}
                        />
                    ) : (
                        <Box sx={{ display: { xs: "none", md: "block" } }} />
                    )}

                <Button
                    variant="contained"
                    onClick={handleAddProductClick}
                    startIcon={<AddIcon />}
                    sx={{
                        height: "56px",
                        gridColumn: { xs: "span 2", md: "span 1" },
                        display: { xs: "flex", sm: "flex", md: "none" }, // only show on mobile
                    }}
                >
                    Add
                </Button>
            </Box>

        </Box>
    );
}
