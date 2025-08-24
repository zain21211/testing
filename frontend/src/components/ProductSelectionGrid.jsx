// src/components/ProductSelectionGrid.jsx
import { forwardRef, useEffect, useImperativeHandle } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    Checkbox,
    FormControlLabel,
    ListItemText,
} from "@mui/material";

const ProductSelectionGrid = forwardRef(({
    userType,
    productIDInput,
    setProductIDInput,
    productIDInputRef,
    companies,
    companyFilter,
    companyInputValue,
    setCompanyInputValue,
    debouncedSetCompanyFilter,
    categories,
    categoryFilter,
    categoryInputValue,
    setCategoryInputValue,
    debouncedSetCategoryFilter,
    Sch,
    setSch,
    isClaim,
    setIsClaim,
    productInputValue,
    setProductInputValue,
    filteredAutocompleteOptions,
    selectedProduct,
    setSelectedProduct,
    setProductID,
    // setProductIDInput,
    setOrderQuantity,
    productInputRef,
    quantityInputRef,
    biggerCheckboxLabelSize,
    biggerInputTextSize,
    biggerShrunkLabelSize,
    initialDataLoading,
    bigger
}, ref) => {

    useImperativeHandle(ref, () => ({
        focus: () => {
            const input = productInputRef?.current?.querySelector('input');
            input?.focus();
        }
    }));



    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(4, 1fr)",
                    sm: "repeat(8, 1fr)",
                    md: "repeat(12, 1fr)",
                },
                gap: { xs: 2, md: 2.5 },
                alignItems: "center",
                mb: 2,
            }}
        >
            {/* Scheme & Claim checkboxes */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    order: { xs: 2, sm: 1 },
                    gridColumn: { xs: "span 1", sm: "span 1" },
                }}
            >
                <FormControlLabel
                    control={<Checkbox checked={Sch} onChange={(e) => setSch(e.target.checked)} />}
                    label="Scheme"
                    labelTypographyProps={{ sx: { fontSize: biggerCheckboxLabelSize } }}
                />
                <FormControlLabel
                    control={<Checkbox checked={isClaim} onChange={(e) => setIsClaim(e.target.checked)} />}
                    label="Claim"
                    labelTypographyProps={{ sx: { fontSize: biggerCheckboxLabelSize } }}
                />
            </Box>
            {/* Product ID + Company */}
            <Box
                sx={{
                    gridColumn: { xs: "span 4", sm: "span 4", md: "span 3" },
                    display: "flex",
                    gap: 1,
                    order: { xs: 1, sm: 1 },
                    ...bigger
                }}
            >
                {!userType?.includes("cust") && (
                    <>
                        <TextField
                            label="Product ID"
                            variant="outlined"
                            inputRef={productIDInputRef}
                            value={productIDInput}
                            onChange={(e) => setProductIDInput(e.target.value)}
                            disabled={initialDataLoading}
                            sx={{ ...bigger, flex: 1 }}
                            onFocus={(e) => e.target.select()}
                            inputProps={{ inputMode: "numeric" }}
                        />
                        <Autocomplete
                            freeSolo
                            options={companies}
                            value={companyFilter}
                            inputValue={companyInputValue}
                            onFocus={(e) => e.target.select()}
                            onInputChange={(e, val) => {
                                setCompanyInputValue(val);
                                debouncedSetCompanyFilter(val);
                            }}
                            renderInput={(params) => <TextField {...params} label="Company" />}
                            sx={{ ...bigger, flex: 1 }}
                            disabled={initialDataLoading}
                        />
                    </>
                )}
                <Autocomplete
                    freeSolo
                    options={categories}
                    value={categoryFilter}
                    inputValue={categoryInputValue}
                    onInputChange={(e, val) => {
                        setCategoryInputValue(val);
                        debouncedSetCategoryFilter(val);
                    }}
                    renderInput={(params) => <TextField {...params} label="Model" />}
                    disabled={initialDataLoading}
                    sx={{ ...bigger, flex: 1 }}
                    onFocus={(e) => e.target.select()}
                />
            </Box>
            {/* Product Autocomplete */}
            <Autocomplete
                freeSolo
                options={
                    productInputValue?.length < 2
                        ? []
                        : filteredAutocompleteOptions ?? []
                }

                getOptionLabel={(option) => option?.Name || ""}
                filterOptions={(x) => x}
                isOptionEqualToValue={(option, value) => option?.ID === value?.ID}
                inputValue={productInputValue}
                value={selectedProduct}
                // BUG FIX STARTS HERE
                onChange={(event, newValue) => {
                    // This handler is triggered when a selection is made or cleared via the 'x'
                    setSelectedProduct(newValue);
                    if (newValue) {
                        // On selection, update the input value and focus the next field
                        setProductInputValue(newValue.Name || "");
                        setOrderQuantity(0);
                        // setError(null);
                        setTimeout(() => {
                            quantityInputRef.current?.focus();
                        }, 100);
                    } else {
                        // If newValue is null (cleared with 'x'), ensure IDs are also cleared
                        setProductID(null);
                        setProductIDInput(null);
                    }
                }}
                onInputChange={(event, newInputValue, reason) => {
                    setProductInputValue(newInputValue);
                    // If the user starts typing and the input no longer matches the selected product,
                    // or if the user clears the input via backspace, we must clear the selection and IDs.
                    if (reason === "input") {
                        // if (selectedProduct && selectedProduct.Name !== newInputValue) {
                        //     setSelectedProduct(null);
                        //     setProductID(null);
                        //     setProductIDInput(null);
                        // }
                    }
                }}
                // BUG FIX ENDS HERE
                renderOption={(props, option, state) => {
                    return (
                        <Box component="li" {...props} key={option.ID}>
                            <ListItemText
                                sx={{ borderBottom: "1px solid #eee" }}
                                primary={option.Name}
                                secondary={
                                    <>
                                        Rate:{" "}
                                        {option.SaleRate != null
                                            ? option.SaleRate.toFixed(0)
                                            : "N/A"}
                                        {" | Co: "}
                                        {option.Company || "-"}
                                        {" | "}
                                        <span style={{ fontWeight: "bold", color: "black" }}>
                                            MODEL: {option.Category || "-"}
                                        </span>
                                    </>
                                }
                                primaryTypographyProps={{ noWrap: true, fontSize: "0.95rem" }} // ADJUSTED
                                secondaryTypographyProps={{
                                    noWrap: true,
                                    fontSize: "0.8rem",
                                }} // ADJUSTED
                            />
                        </Box>
                    );
                }}
                slotProps={{
                    popper: {
                        sx: { minWidth: 350, width: "auto !important" },
                    },
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label="Select Product"
                        variant="outlined"
                        inputRef={productInputRef}
                        InputProps={{
                            ...params.InputProps,
                            sx: {
                                ...params.InputProps.sx,
                                color: isClaim ? "white" : undefined,
                                backgroundColor: isClaim ? "red" : undefined,
                                ".MuiOutlinedInput-notchedOutline": {
                                    borderColor: isClaim ? "red !important" : undefined,
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: isClaim ? "darkred !important" : undefined,
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor: isClaim ? "darkred !important" : undefined,
                                },
                                // Apply font size to the input element itself
                                "& .MuiInputBase-input": { fontSize: biggerInputTextSize },
                            },
                        }}
                        InputLabelProps={{
                            ...params.InputLabelProps,
                            sx: {
                                ...params.InputLabelProps?.sx,
                                color: isClaim ? "white" : undefined,
                                // Apply font size to the label when shrunk
                                "&.MuiInputLabel-shrink": { fontSize: biggerShrunkLabelSize },
                            },
                        }}
                        onKeyDown={(e) => {
                            if (
                                (e.key === "Enter" || e.key === "Tab") &&
                                !selectedProduct
                            ) {
                                if (
                                    filteredAutocompleteOptions?.length > 0 &&
                                    filteredAutocompleteOptions[0]?.ID != null
                                ) {
                                    setSelectedProduct(filteredAutocompleteOptions[0]);
                                    setProductInputValue(
                                        filteredAutocompleteOptions[0].Name || ""
                                    );
                                    e.preventDefault();
                                }
                            } else if (
                                (e.key === "Enter" || e.key === "Tab") &&
                                selectedProduct
                            ) {
                                e.preventDefault();
                                quantityInputRef.current?.focus();
                            }
                        }}
                    />
                )}
                sx={{ gridColumn: { xs: "span 3", sm: "span 3", md: "span 4" }, order: { xs: 1, sm: 1 }, }}
                disabled={initialDataLoading}
                loading={initialDataLoading && !products?.length}
            // noOptionsText={getNoOptionsText()}
            />

            {/* Urdu name */}
            {selectedProduct && (
                <TextField
                    value={` ${selectedProduct?.Company} - ${selectedProduct?.Category} | ${selectedProduct?.UrduName}`}
                    fullWidth
                    disabled
                    sx={{
                        gridColumn: "span 4",
                        order: { xs: 4, sm: 4 },

                        // mt: 1,
                        "& .MuiInputBase-input.Mui-disabled": {
                            fontWeight: "bold",
                            fontFamily: "Jameel Noori Nastaleeq, serif",
                            color: "black",
                            textAlign: "center",
                            WebkitTextFillColor: "black !important",
                            fontSize: { xs: "2.1rem", sm: "1.7rem" },
                        },
                    }}
                />
            )}
        </Box>
    );
})

export default ProductSelectionGrid;