import React, { useMemo } from 'react';
import { Box, TextField, Typography, Skeleton } from '@mui/material';
import DataTable from '../table'; // Assuming this is your lazy-loaded table component

const productDetail = [
    { label: "qty", size: 1 },
    { label: "T.Q", size: 1 },
    { label: "Product", align: "right" },
];

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const ProductCell = ({ field, value, row, isEditable, onQuantityChange }) => {
    let displayValue = "";

    if (field.label === "Product") {
        displayValue = ` ${row.Product?.toUpperCase() || "error"}`;
    } else if (field.label === "B.Q") {
        displayValue = row.BQ || "0";
    } else if (field.label === "FOC") {
        displayValue = row.FOC || "0";
    } else if (field.label === "T.Q") {
        displayValue = row.TQ || "0";
    } else if (field.label === "Price") {
        displayValue = row.Price || "0";
    } else if (field.label === "D%") {
        displayValue = row.Disc2 || "0";
    } else if (field.label === "Amount") {
        displayValue = formatCurrency(row.Amount) || "0";
    }

    const isFit = row.Company?.toLowerCase().includes("fit");
    const isSTG = row.Company?.toLowerCase().includes("stg");
    const isStrong = row.Company?.toLowerCase().includes("strong");
    const companyColor = isStrong
        ? "#000"
        : isFit
            ? "#fc6a03"
            : isSTG
                ? "red"
                : "grey";

    return (
        <Box>
            <TextField
                variant="standard"
                multiline={!isEditable && field.label === "Product"}
                value={isEditable ? value : displayValue}
                type={["Qty", "Price", "Discount", "BILL"].includes(field.label) ? "number" : "text"}
                InputProps={{
                    disableUnderline: isEditable ? false : true,
                    disabled: !isEditable,
                    startAdornment: field.label === "Product" ? (
                        <Box sx={{ minWidth: "120px", paddingRight: "0.5rem" }}>
                            <Typography variant="body1" sx={{
                                fontWeight: "bold",
                                fontSize: "1.2rem",
                                color: "black",
                            }}>
                                {row.Category?.toUpperCase()}
                            </Typography>
                            <Typography sx={{
                                fontWeight: "bold",
                                backgroundColor: companyColor,
                                color: "white !important",
                                fontSize: "1.2rem",
                                borderRadius: '.5rem',

                            }}>
                                {row.Company?.toUpperCase()}
                            </Typography>
                        </Box>
                    ) : undefined,
                    sx: {
                        backgroundColor: isEditable ? "#d1ffbd" : "transparent",
                        fontWeight: "bold",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        fontSize: field.label === "Product" ? "2rem" : "1.5rem",
                        color: "black",
                        "& .MuiInputBase-input": {
                            fontWeight: "bold",
                            letterSpacing: "normal",
                        },
                        "& .MuiInputBase-input.Mui-disabled": {
                            fontWeight: "bold",
                            WebkitTextFillColor: "black !important",
                        },
                    },
                }}
                onFocus={(e) => e.target.select()}
                inputProps={{
                    lang: "ur",
                    inputMode: isEditable ? "decimal" : "",
                    step: "any",
                    sx: {
                        textAlign: field.label === "Product" ? "RIGHT" : "center",
                        fontSize: field.label === "Product" ? "2rem" : "1em",
                        whiteSpace: "normal",
                        backgroundColor: isEditable ? "#d1ffbd" : "transparent",
                        border: isEditable ? "1px solid #ccc" : "none",
                        fontWeight: "bold",
                        color: "black",
                        "& .Mui-disabled": {
                            fontWeight: "bold",
                            textAlign: "right",
                            WebkitTextFillColor: "black !important",
                        },
                    },
                }}
                onChange={(e) => {
                    if (!isEditable) return;
                    onQuantityChange(row, e.target.value);
                }}
                sx={{ width: "100%" }}
            />
            {field.label === "T.Q" && (
                <Typography>
                    ({row?.Size || '--'})
                </Typography>
            )}
            {field.label === "Product" && (
                <Box sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-end",
                    justifyContent: "space-between",
                    height: "100%",
                    marginBottom: .5,

                }}>
                    <Typography sx={{
                        fontWeight: "bold",
                        color: "black !important",
                        fontSize: "1rem",
                        minWidth: 120,
                        borderRadius: '.5rem',
                        border: "1px solid black",
                    }}>
                        {row.StockQTY || "0"}
                    </Typography>
                    {row.SchPcs > 0 && (
                        <Typography sx={{
                            fontFamily: "Jameel Noori Nastaleeq, serif",
                            fontSize: "1.2rem",
                            textAlign: "right",
                            color: "#666",
                            lineHeight: 1,
                        }}>
                            {row.SchOn} + {row.SchPcs}
                        </Typography>
                    )}

                </Box>
            )}

        </Box>
    );
};

const ProductTable = ({
    products,
    updatedInvoice,
    onQuantityChange,
    onLoad
}) => {

    const memoizedColumns = useMemo(() => {
        return productDetail.map((field) => ({
            id: field.label.toLowerCase(),
            label: field.label,
            align: "center",
            width: field.label === "Product" ? "25%" : "5%",
            minWidth: field.label === "Product" ? 178 : "5%",
            render: (value, row) => {
                const isEditable = field.label === "qty";

                const updatedItem = updatedInvoice.find(
                    (item) => String(item.psid) === String(row.psid)
                );
                const currentValue = isEditable ? updatedItem?.qty ?? "" : value;

                return (
                    <ProductCell
                        field={field}
                        value={currentValue}
                        row={row}
                        isEditable={isEditable}
                        onQuantityChange={onQuantityChange}
                    />

                );
            },
        }));
    }, [productDetail, updatedInvoice, onQuantityChange]);

    return (
        <DataTable
            data={products ?? []}
            columns={memoizedColumns}
            rowKey="id"
            apiEndpoint="invoices"
            onLoad={onLoad}
            sx={{
                "& .MuiTableCell-root": {
                    border: "5px solid #ddd",
                    padding: ".25rem",
                    boxSizing: "border-box",
                },
                width: "100%",
            }}
        />
    );
};

export default ProductTable;