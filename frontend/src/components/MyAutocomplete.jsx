// MyAutocomplete.js (this is the last version I provided, with localInputValue)
import React, { useState, useEffect } from "react";
import { Autocomplete, TextField } from "@mui/material";

export default function MyAutocomplete({
    field,
    formData, // This now receives the full formData object
    accounts = [],
    urdu = [],
    handleChange,
    cleanString,
    errors,
}) {
    // This state directly controls what's displayed in the TextField portion of Autocomplete.
    // It should be kept in sync with formData[field]
    const [localInputValue, setLocalInputValue] = useState(formData[field] ?? "");
    const [filteredOptions, setFilteredOptions] = useState([]);

    // Sync localInputValue when parent formData changes (e.g., initial load, external reset)
    useEffect(() => {
        // Only update localInputValue if it's different from formData[field]
        // This prevents unnecessary re-renders or conflicting updates if the user is typing
        if (localInputValue !== (formData[field] ?? "")) {
            setLocalInputValue(formData[field] ?? "");
        }
    }, [formData[field]]); // Only depend on the specific field's value

    useEffect(() => {
        console.log('in the handler')
        const handler = setTimeout(() => {
            console.log('onchange', localInputValue)

            handleChange({ target: { name: cleanString(field), value: localInputValue } });
        }, 2000);

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

    // Handle reset when both name fields are empty (if applicable)
    useEffect(() => {
        if (!formData?.name && !formData?.urduname)
            setLocalInputValue("");
        // Also explicitly clear the parent formData for this field if it's not already empty
        // This is crucial if `formData.name` or `formData.urduname` are becoming empty
        // as part of an external reset condition, and you want the parent to reflect that.

    }, [formData]); // Added missing dependencies

    useEffect(() => {
        console.log('in complete', formData)
    }, [formData])


    return (
        <Autocomplete
            freeSolo
            sx={{ gridColumn: "span 2" }}
            options={filteredOptions}
            // `value` should be null if you are not using specific "selections" from options
            // as the primary state for your form. This lets `inputValue` drive the text.
            value={null}
            // `inputValue` is now fully controlled by our local state, which is synced to formData.
            inputValue={localInputValue}
            onInputChange={(_, newInputValue) => {
                console.log(`MyAutocomplete "${field}" - onInputChange:`, newInputValue);
                setLocalInputValue(newInputValue);
                // setTimeout(() => {
                //     handleChange({ target: { name: cleanString(field), value: newInputValue } });
                // }, 2000);
            }}
            onChange={(_, newValue) => {
                console.log(`MyAutocomplete "${field}" - onChange:`, newValue);
                setLocalInputValue(newValue ?? "");
                handleChange({ target: { name: cleanString(field), value: newValue ?? "" } });
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={field}
                    error={!!errors[cleanString(field)]}
                    helperText={errors[cleanString(field)]}
                    fullWidth
                    required
                    size="small"
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