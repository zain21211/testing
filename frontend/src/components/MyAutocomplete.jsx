// MyAutocomplete.js (this is the last version I provided, with localInputValue)
import React, { useState, useEffect } from "react";
import { Autocomplete, TextField } from "@mui/material";

export default function MyAutocomplete({
    field,
    errors,
    onReset,
    formData,
    disabled,
    onSelect,
    urdu = [],
    cleanString,
    handleChange,
    accounts = [],
}) {
    const [localInputValue, setLocalInputValue] = useState(formData[field] ?? "");
    const [filteredOptions, setFilteredOptions] = useState([]);

    // Sync localInputValue when parent formData changes (e.g., initial load, external reset)
    useEffect(() => {
        if (localInputValue !== (formData[cleanString(field)] ?? "")) {
            setLocalInputValue(formData[cleanString(field)] ?? "");
        }
    }, [formData]);

    useEffect(() => {
        const handler = setTimeout(() => {
            handleChange({
                target: {
                    name: cleanString(field),
                    value: localInputValue
                }
            });
        }, 50);

        return () => clearTimeout(handler); // clear previous timeout if input changes
    }, [localInputValue]);

    // Filter options based on the localInputValue (what the user is currently typing)
    useEffect(() => {
        const val = localInputValue.trim();
        if (val.length > 2) {
            const timeout = setTimeout(() => {
                const lowerVal = val.toLowerCase();
                const filtered = [
                    ...(accounts?.filter((a) => a.toLowerCase().includes(lowerVal)) ?? []),
                    // ...(urdu?.filter((u) => u.includes(val)) ?? []),
                ];
                setFilteredOptions(filtered);
            }, 300);
            return () => clearTimeout(timeout);
        } else {
            setFilteredOptions([]);
        }
    }, [localInputValue, accounts, urdu]);

    return (
        <Autocomplete
            freeSolo
            // value={null}
            disabled={disabled}
            options={filteredOptions}
            inputValue={localInputValue}
            sx={{ gridColumn: "span 2" }}
            onInputChange={(_, newInputValue) => {
                if (newInputValue === "") {
                    onReset();
                }

                setLocalInputValue(newInputValue);
            }}
            onChange={(_, newValue) => {
                if (!newValue) {
                    onReset();
                }
                onSelect(newValue)
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    required
                    fullWidth
                    size="small"
                    label={field}
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
                        style: { textAlign: field.includes("name") ? "right" : "left" },
                    }}
                />
            )}
        />
    );
}