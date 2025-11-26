// src/components/ProductSelectionGrid.jsx
import { forwardRef, useEffect, useImperativeHandle, useState, useRef } from 'react';
import {
    Box,
    TextField,
    Autocomplete,
    Checkbox,
    FormControlLabel,
    ListItemText,
    useMediaQuery,
    useTheme,
    Popper,
    Paper,
    ClickAwayListener
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
    setOrderQuantity,
    productInputRef,
    quantityInputRef,
    biggerCheckboxLabelSize,
    biggerInputTextSize,
    biggerShrunkLabelSize,
    initialDataLoading,
    bigger
}, ref) => {

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [popupOpen, setPopupOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
    const popperRef = useRef(null);

    useImperativeHandle(ref, () => ({
        focus: () => {
            const input = productInputRef?.current?.querySelector('input');
            input?.focus();
        }
    }));

    // Detect keyboard open/close
    useEffect(() => {
        const handleResize = () => {
            const newViewportHeight = window.visualViewport?.height || window.innerHeight;
            setViewportHeight(newViewportHeight);
            // If viewport height is significantly reduced, keyboard is likely open
            setKeyboardOpen(newViewportHeight < window.innerHeight * 0.8);
        };

        // Use visualViewport if available, otherwise fall back to window resize
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        } else {
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            } else {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    // Adjust popper position when keyboard state changes
    useEffect(() => {
        if (popupOpen && popperRef.current && isMobile) {
            const popper = popperRef.current;

            if (keyboardOpen) {
                // Position above keyboard
                const keyboardHeight = window.innerHeight - viewportHeight;
                popper.style.bottom = `${keyboardHeight + 10}px`;
                popper.style.top = 'auto';
                popper.style.maxHeight = `${viewportHeight - 20}px`;
            } else {
                // Center vertically
                popper.style.top = '50%';
                popper.style.bottom = 'auto';
                popper.style.transform = 'translate(-50%, -50%)';
                popper.style.maxHeight = '70vh';
            }
        }
    }, [keyboardOpen, popupOpen, viewportHeight, isMobile]);

    // Mobile popper with keyboard handling
    const MobilePopper = ({ children, ...props }) => {
        return (
            <Popper
                {...props}
                ref={popperRef}
                placement="bottom-start"
                style={{
                    position: 'fixed',
                    width: '90vw',
                    maxWidth: '90vw',
                    zIndex: 1300,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    top: '50%',
                    maxHeight: '70vh',
                }}
            >
                <ClickAwayListener onClickAway={() => setPopupOpen(false)}>
                    <Paper
                        elevation={8}
                        sx={{
                            maxHeight: 'inherit',
                            overflow: 'auto',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {children}
                    </Paper>
                </ClickAwayListener>
            </Popper>
        );
    };

    // Desktop popper remains the same
    const DesktopPopper = ({ children, ...props }) => {
        return (
            <Popper
                {...props}
                placement="bottom-start"
                style={{
                    width: '100%',
                    zIndex: 1300,
                }}
            >
                <Paper
                    elevation={8}
                    sx={{
                        maxHeight: '50vh',
                        overflow: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        mt: 1,
                    }}
                >
                    {children}
                </Paper>
            </Popper>
        );
    };

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
                            InputLabelProps={{ shrink: true }}
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
                            disablePortal={isMobile}
                            PopperComponent={isMobile ? MobilePopper : DesktopPopper}
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
                    sx={{ ...bigger, flex: 1 }}
                    onFocus={(e) => e.target.select()}
                    disablePortal={isMobile}
                    PopperComponent={isMobile ? MobilePopper : DesktopPopper}
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
                onOpen={(event) => {
                    setPopupOpen(true);
                    setAnchorEl(event.currentTarget);
                }}
                onClose={() => {
                    setPopupOpen(false);
                    setAnchorEl(null);
                }}
                onChange={(event, newValue) => {
                    setSelectedProduct(newValue);
                    if (newValue) {
                        setProductInputValue(newValue.Name || "");
                        setOrderQuantity(0);
                        setTimeout(() => {
                            quantityInputRef.current?.focus();
                        }, 100);
                    } else {
                        setProductID(null);
                        setProductIDInput(null);
                    }
                }}
                onInputChange={(event, newInputValue, reason) => {
                    setProductInputValue(newInputValue);
                }}
                renderOption={(props, option, state) => {
                    return (
                        <Box component="li" {...props} key={option.ID}>
                            <ListItemText
                                sx={{ borderBottom: "1px solid #eee" }}
                                primary={
                                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                                        <span>{option.Name}</span>
                                        <span style={{ color: "#666", fontSize: "1.8rem", fontWeight: "bold", fontFamily: 'Jameel Noori Nastaleeq' }}>{option.UrduName}</span>

                                    </Box>}
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
                                primaryTypographyProps={{ noWrap: true, fontSize: "0.95rem" }}
                                secondaryTypographyProps={{
                                    noWrap: true,
                                    fontSize: "0.8rem",
                                }}
                            />
                        </Box>
                    );
                }}
                PopperComponent={isMobile ? MobilePopper : DesktopPopper}
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
                                "& .MuiInputBase-input": { fontSize: biggerInputTextSize },
                            },
                        }}
                        InputLabelProps={{
                            ...params.InputLabelProps,
                            sx: {
                                ...params.InputLabelProps?.sx,
                                color: isClaim ? "white" : undefined,
                                "&.MuiInputLabel-shrink": { fontSize: biggerShrunkLabelSize },
                            },
                        }}
                        onKeyDown={(e) => {
                            if (
                                (e.key === "Enter") &&
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
                sx={{
                    gridColumn: { xs: "span 3", sm: "span 3", md: "span 4" },
                    order: { xs: 1, sm: 1 },
                }}
                disabled={initialDataLoading}
                disablePortal={isMobile}
            />

            {/* Urdu name */}
            <TextField
                label="Urduname"
                // value={` ${selectedProduct?.Company || ''} - ${selectedProduct?.Category || ''} | ${selectedProduct?.UrduName || ''}`}
                value={[
                    selectedProduct?.Company,
                    selectedProduct?.Category
                ].filter(Boolean).join(" - ") +
                    (selectedProduct?.UrduName ? ` | ${selectedProduct.UrduName}` : '')}

                fullWidth
                disabled
                sx={{
                    gridColumn: "span 4",
                    order: { xs: 4, sm: 4 },
                    "& .MuiInputBase-input.Mui-disabled": {
                        p: 1.5,
                        fontWeight: "bold",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        color: "black",
                        textAlign: "center",
                        WebkitTextFillColor: "black !important",
                        fontSize: { xs: "2.1rem", sm: "1.7rem" },
                    },
                }}
            />
        </Box>
    );
})

export default ProductSelectionGrid;