import React from "react";
import { Autocomplete, TextField, Button, Box } from "@mui/material";

export default function DiscountForm({
    discount,
    setDiscount,
    discountFields,
    discountOptions,
    handleAdd,
    cleanString,
}) {
    const handleDiscount = (e) => {
        const { name, value } = e.target;
        setDiscount((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <Box
            sx={{
                // display: "grid",
                // gridTemplateColumns: "repeat(5, 1fr)",
                display: "flex",
                // flexWrap: "wrap",
                gap: 1.5,
                alignItems: "center",
                mb: 1.5,
            }}
        >
            {discountFields.map((field, index) => (
                <Autocomplete
                    key={index}
                    freeSolo
                    options={field.options}
                    value={discount?.[cleanString(field.label)] || ""}
                    onChange={(_, newValue) =>
                        handleDiscount({ target: { name: cleanString(field.label), value: newValue } })
                    }
                    onInputChange={(_, newInputValue) =>
                        handleDiscount({ target: { name: cleanString(field.label), value: newInputValue } })
                    }
                    renderInput={(params) => (
                        <TextField {...params} label={field.label} fullWidth size="small" />
                    )}
                />
            ))}
            {discountOptions.map((field) => (
                <TextField
                    key={field}
                    label={field}
                    name={cleanString(field)}
                    value={discount?.[cleanString(field)] || ""}
                    onChange={handleDiscount}
                    fullWidth
                    size="small"
                />
            ))}
            <Button
                onClick={handleAdd}
                variant="contained"
                color="primary"
                sx={{ height: "40px" }}
            >
                Add
            </Button>
        </Box>
    );
}
