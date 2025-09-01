import React, { useState, useEffect } from "react";
import { Autocomplete, TextField } from "@mui/material";

export default function MyAutocomplete({ field, formData, accounts, urdu, handleChange, cleanString, errors }) {
    const [inputValue, setInputValue] = useState("");
    const [urduInputValue, setUrduInputValue] = useState("");
    const [filteredOptions, setFilteredOptions] = useState([]);

    useEffect(() => {
        console.log(formData)
    }, [formData])

    // English filtering
    useEffect(() => {
        if (inputValue.length > 2) {
            const timeout = setTimeout(() => {
                setFilteredOptions(
                    accounts?.filter(
                        (acc) =>
                            acc.toLowerCase().includes(inputValue.toLowerCase()) ||
                            acc.toLowerCase().includes(urduInputValue.toLowerCase())
                    ) ?? []
                );
            }, 300);
            return () => clearTimeout(timeout);
        } else setFilteredOptions([]);
    }, [inputValue, accounts, urduInputValue]);

    // Urdu filtering
    useEffect(() => {
        if (urduInputValue.length > 2) {
            const timeout = setTimeout(() => {
                setFilteredOptions(
                    urdu?.filter((acc) => acc?.includes(urduInputValue)) ?? []
                );
            }, 300);
            return () => clearTimeout(timeout);
        } else setFilteredOptions([]);
    }, [urdu, urduInputValue]);

    return (
        <Autocomplete
            freeSolo
            sx={{ gridColumn: "span 2" }}
            options={filteredOptions}
            value={formData[field]}
            inputValue={formData[field]}
            onInputChange={(_, newValue) => {
                if (field.includes("urdu")) setUrduInputValue(newValue);
                else setInputValue(newValue);

                handleChange({ target: { name: cleanString(field), value: newValue } });
            }}
            onChange={(_, newValue) =>
                handleChange({ target: { name: cleanString(field), value: newValue } })
            }
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={field}
                    value={formData[field]}

                    error={!!errors[cleanString(field)]}
                    helperText={errors[cleanString(field)]}
                    InputProps={{
                        ...params.InputProps,
                        sx: {
                            fontSize: field.includes("name") ? "2rem" : "1.3rem",
                            fontFamily: field.includes("name")
                                ? "Jameel Noori Nastaleeq, serif !important"
                                : "",
                            dir: field.includes("name") ? "rtl" : "ltr",
                            textAlign: field.includes("name") ? "right" : "left",
                        },
                    }}
                    inputProps={{
                        ...params.inputProps,
                        dir: field.includes("name") ? "rtl" : "ltr",
                        style: {
                            textAlign: field.includes("name") ? "right" : "left",
                        },
                    }}
                    InputLabelProps={{
                        sx: { fontSize: "1.3rem" },
                    }}
                    fullWidth
                    required
                    size="small"
                />
            )}
        />
    );
}
