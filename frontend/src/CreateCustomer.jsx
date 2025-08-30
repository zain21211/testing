import React, { useCallback, useRef, useEffect, useState } from "react";
import debounce from "lodash.debounce";
import {
    TextField,
    Button,
    Card,
    CardContent,
    Typography,
    Box,
    Autocomplete,
    List,
    ListItem,
    ListItemText,
    Tabs,
    Tab,
    Divider,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
} from "@mui/material";
import axios from "axios";

const fields = [
    "Name",
    "Urdu name",
    "Address",
    "Route",
    "Phone Number",
    "Whatsapp",
    "Credit Days",
    "Credit Limit",
];
const discountOptions = ["d1", "d2"]; // example options
const types = ["Customer", "Prospect", "Workshop",];

const cleanString = (string) => {
    const cleaned = string?.toLowerCase().replace(/\s/g, "");
    return cleaned;
};

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && (
                <Box sx={{ p: 2 }}>
                    <Typography>{children}</Typography>
                </Box>
            )}
        </div>
    );
}

export function MyAutocomplete({
    field,
    accounts,
    handleChange,
    cleanString,
    errors,
    urdu,
}) {
    const [inputValue, setInputValue] = useState("");
    const [urduInputValue, setUrduInputValue] = useState("");
    const [filteredOptions, setFilteredOptions] = useState([]);

    useEffect(() => {

        if (inputValue.length > 2) {
            // Debounce filtering by 300ms
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
        } else {
            setFilteredOptions([]);
        }
    }, [inputValue, accounts]);

    // for urdu names
    useEffect(() => {
        if (urduInputValue.length > 2) {
            // Debounce filtering by 300ms
            const timeout = setTimeout(() => {
                setFilteredOptions(
                    urdu?.filter((acc) => acc?.includes(urduInputValue)) ?? []
                );
            }, 300);

            return () => clearTimeout(timeout);
        } else {
            setFilteredOptions([]);
        }
    }, [urdu, urduInputValue]);

    return (
        <Autocomplete
            freeSolo
            // key={field}
            sx={{ gridColumn: "span 2" }}
            options={filteredOptions}
            inputValue={field.includes("name") ? urduInputValue : inputValue}
            onInputChange={(_, newValue) => {
                if (field.includes("name")) {
                    setUrduInputValue(newValue);
                } else {
                    setInputValue(newValue);
                }
                // debouncedHandleChange(cleanString(field), newValue);
                handleChange({ target: { name: cleanString(field), value: newValue } });

            }}
            onChange={(_, newValue) => {
                handleChange({ target: { name: cleanString(field), value: newValue } });
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
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
                    disablePortal
                    ListboxProps={{
                        style: { maxHeight: "200px", overflow: "auto" },
                    }}
                    PopperProps={{
                        sx: { zIndex: 1300 }, // Above dialogs
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

const tabStyle = {
    // my: 1,
    padding: "0 1rem",
    color: "#000",
    // fontSize: '1rem',
    minWidth: "unset",
    fontWeight: "bold",
    textTransform: "uppercasse",
    transition: "all 0.3s ease-in",
    gridColumn: "span 1",
    "&.Mui-selected": {
        color: "#000",
        borderRadius: "2rem",
        backgroundColor: "#f0f0f0!important",
        border: "0px solid #ccc",
        boxShadow:
            "0 2px 4px rgba(112, 112, 112, 0.14), 0 -2px 4px rgba(112, 112, 112, 0.14)",
    },
};

const CreateCustomer = ({ onCustomerCreated, accounts, urdu }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([]);
    const [listOptions, setListOptions] = useState([]);
    const [discount, setDiscount] = useState(null);
    const [discountList, setDiscountList] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [filteredOptions, setFilteredOptions] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [urduInputValue, setUrduInputValue] = useState("");

    const handleTabChange = (event) => {
        const value = event.target.textContent.toLowerCase();
        setTabValue(value === "create" ? 0 : 1);
    };

    useEffect(() => {
        setCompanyOptions(["fit", "excel", "strong"]);
        setListOptions(["A", "B"]);
    }, []);

    const discountFields = [
        {
            label: "Company",
            options: companyOptions,
        },
        {
            label: "List",
            options: listOptions,
        },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            return { ...prev, [name]: value };   // ✅ merges safely
        });
        setErrors(prev => ({ ...prev, [name]: "" }));
    };


    const handleDiscount = (e) => {
        const { name, value } = e.target;
        setDiscount({ ...discount, [name]: value });
    };

    const handleAdd = () => {
        if (discount && Object.values(discount).some((v) => v)) {
            // Define your key order
            const keyOrder = ["company", "list", "d1", "d2"];

            // Reorder the discount object
            const ordered = {};
            keyOrder.forEach((key) => {
                if (key in discount) {
                    ordered[key] = discount[key];
                }
            });

            // Add to the list
            setDiscountList((prev) => [...prev, ordered]);

            // Reset for next entry
            setDiscount(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const finalFormData = { ...formData, discounts: discountList };
            console.log(finalFormData);
            await axios.post("http://localhost:3001/api/customers", finalFormData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            onCustomerCreated();
            setFormData({});
            setDiscountList([]);
        } catch (error) {
            console.error("Error creating customer:", error);
            alert("Failed to create account.");
        }
    };

    useEffect(() => {
        console.log("form changed:", formData);
    }, [formData]);

    useEffect(() => {
        if (inputValue.length > 2) {
            // Debounce filtering by 300ms
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
        } else {
            setFilteredOptions([]);
        }
    }, [inputValue, accounts, urduInputValue]);
    return (
        <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
                {/* add tabs */}
                <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    TabIndicatorProps={{ style: { display: "none" } }}
                    sx={{
                        mb: 2,
                        borderRadius: "2rem",
                        backgroundColor: "#e0e0e0",
                        boxShadow: `
                inset 0 2px 4px rgba(112, 112, 112, 0.14),
                inset 0 -2px 4px rgba(112, 112, 112, 0.14)
                `,
                        "& .MuiTabs-flexContainer": {
                            display: "flex",
                            justifyContent: "space-between", // space tabs evenly
                        },
                        "& .MuiTab-root": {
                            flex: 1, // make each tab take equal width
                            maxWidth: "none", // remove default max width
                        },
                    }}
                >
                    <Tab label="create" sx={tabStyle} disableRipple />
                    <Tab label="update" sx={tabStyle} disableRipple />
                </Tabs>

                {/* for creating */}
                <TabPanel value={tabValue} index={0}>

                    <Box component="form" onSubmit={handleSubmit}>
                        {/* Customer Fields */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: 1.5,
                            }}
                        >
                            {fields.map((field) => {
                                return field.toLocaleLowerCase().includes("name") ? (
                                    <MyAutocomplete
                                        field={field}
                                        accounts={accounts}
                                        handleChange={handleChange}
                                        cleanString={cleanString}
                                        urdu={urdu}
                                        errors={!!errors[cleanString(field)]}
                                    />
                                ) : (
                                    <TextField
                                        key={field}
                                        label={field}
                                        name={cleanString(field)}
                                        value={formData[cleanString(field)] || ""}
                                        onChange={handleChange}
                                        error={!!errors[cleanString(field)]}
                                        helperText={errors[cleanString(field)]}
                                        InputProps={{
                                            sx: { fontSize: "1.3rem" },
                                        }}
                                        InputLabelProps={{
                                            sx: { fontSize: "1.3rem" },
                                        }}
                                        fullWidth
                                        required
                                        size="small"
                                    />
                                );
                            })}
                        </Box>
                        <Box sx={{ ...tabStyle, marginTop: 2 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="type-label">Type</InputLabel>
                                <Select
                                    labelId="type-label"
                                    value={formData.type}
                                    name="type"
                                    onChange={handleChange}
                                >
                                    {types.map((type, index) => (

                                        <MenuItem key={index} value={type} sx={{ borderBottom: index < types.length - 1 ? '1px solid black' : undefined, m: 1 }}>
                                            {type}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Discount Section Divider */}
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="body1">Discounts</Typography>
                        </Divider>

                        {/* Discount Input Fields */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(5, 1fr)",
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
                                    onChange={(event, newValue) => {
                                        // Fires when selecting an option or pressing Enter
                                        handleDiscount({
                                            target: {
                                                name: cleanString(field.label),
                                                value: newValue,
                                            },
                                        });
                                    }}
                                    onInputChange={(event, newInputValue) => {
                                        // Fires on typing, clearing, pasting, etc.
                                        handleDiscount({
                                            target: {
                                                name: cleanString(field.label),
                                                value: newInputValue,
                                            },
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={field.label}
                                            fullWidth
                                            size="small"
                                        />
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

                        {/* Applied Discounts List */}
                        {discountList?.length > 0 && (
                            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
                                <List dense sx={{ py: 0 }}>
                                    {discountList.map((item, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem sx={{ py: 0.5 }}>
                                                <ListItemText
                                                    primary={
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                flexWrap: "wrap",
                                                                gap: "0.25rem 1rem",
                                                            }}
                                                        >
                                                            {Object.entries(item).map(([key, value]) => (
                                                                <Typography
                                                                    component="span"
                                                                    variant="body2"
                                                                    key={key}
                                                                    sx={{ textTransform: "uppercase" }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        component="span"
                                                                        sx={{ fontWeight: "bold" }}
                                                                    >
                                                                        {key}:
                                                                    </Typography>
                                                                    {` ${String(value)}`}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < discountList.length - 1 && (
                                                <Divider component="li" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Box>
                        )}

                        <DualCameraUpload />

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            sx={{ mt: 2, fontWeight: "bold", fontSize: "1.2rem" }}
                            variant="contained"
                            color="primary"
                            fullWidth
                        >
                            Create Account
                        </Button>
                    </Box>
                </TabPanel>

                {/* for update */}
                <TabPanel value={tabValue} index={1}>
                    <Typography variant="h6" component="h1" gutterBottom>
                        Update Customer
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit}>

                        {/* Customer Fields */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: 1.5,
                            }}
                        >
                            {["ACID", ...fields].map((field) => (
                                <TextField
                                    key={field}
                                    label={field}
                                    name={cleanString(field)}
                                    value={formData[cleanString(field)] || ""}
                                    onChange={handleChange}
                                    error={!!errors[cleanString(field)]}
                                    helperText={errors[cleanString(field)]}
                                    fullWidth
                                    size="small"
                                />
                            ))}
                        </Box>

                        {/* Discount Section Divider */}
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="body1">Discounts</Typography>
                        </Divider>

                        {/* Discount Input Fields */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(5, 1fr)",
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
                                    onChange={(event, newValue) => {
                                        // Fires when selecting an option or pressing Enter
                                        handleDiscount({
                                            target: {
                                                name: cleanString(field.label),
                                                value: newValue,
                                            },
                                        });
                                    }}
                                    onInputChange={(event, newInputValue) => {
                                        // Fires on typing, clearing, pasting, etc.
                                        handleDiscount({
                                            target: {
                                                name: cleanString(field.label),
                                                value: newInputValue,
                                            },
                                        });
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label={field.label}
                                            fullWidth
                                            size="small"
                                        />
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

                        {/* Applied Discounts List */}
                        {discountList?.length > 0 && (
                            <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
                                <List dense sx={{ py: 0 }}>
                                    {discountList.map((item, index) => (
                                        <React.Fragment key={index}>
                                            <ListItem sx={{ py: 0.5 }}>
                                                <ListItemText
                                                    primary={
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                flexWrap: "wrap",
                                                                gap: "0.25rem 1rem",
                                                            }}
                                                        >
                                                            {Object.entries(item).map(([key, value]) => (
                                                                <Typography
                                                                    component="span"
                                                                    variant="body2"
                                                                    key={key}
                                                                    sx={{ textTransform: "uppercase" }}
                                                                >
                                                                    <Typography
                                                                        variant="body2"
                                                                        component="span"
                                                                        sx={{ fontWeight: "bold" }}
                                                                    >
                                                                        {key}:
                                                                    </Typography>
                                                                    {` ${String(value)}`}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    }
                                                />
                                            </ListItem>
                                            {index < discountList.length - 1 && (
                                                <Divider component="li" />
                                            )}
                                        </React.Fragment>
                                    ))}
                                </List>
                            </Box>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            sx={{ mt: 2, fontWeight: "bold" }}
                            variant="contained"
                            color="primary"
                            fullWidth
                        >
                            Create Account
                        </Button>
                    </Box>
                </TabPanel>
            </CardContent>
        </Card>
    );
};

export default CreateCustomer;

export function DualCameraUpload() {
    const [images, setImages] = useState({
        customer: null,
        shop: null,
        agreement: null,
    });

    const handleImageChange = (event, type) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImages((prev) => ({
                ...prev,
                [type]: URL.createObjectURL(file),
            }));
        }
    };

    return (
        <Box display="flex" flexDirection="column" gap={3} alignItems="center">
            <Box
                sx={{ display: "flex", flexDirection: "row", gap: 2, width: "100%" }}
            >
                {/* Customer photo input */}
                <input
                    accept="image/*"
                    capture="user" // front camera for customer selfie
                    style={{ display: "none" }}
                    id="customer-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "customer")}
                />
                <label htmlFor="customer-upload">
                    <Button
                        variant="contained"
                        component="span"
                        color="primary"
                        fontSize="1.2rem"
                        width="100%"
                        sx={{ fontSize: { xs: "1.2rem", sm: "" } }}
                    >
                        Customer Photo
                    </Button>
                </label>

                {/* Shop photo input */}
                <input
                    accept="image/*"
                    capture="environment" // back camera for shop image
                    style={{ display: "none" }}
                    id="shop-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "shop")}
                />
                <label htmlFor="shop-upload">
                    <Button
                        variant="contained"
                        component="span"
                        color="secondary"
                        width="100%"
                        fontSize="1.2rem"
                        sx={{ fontSize: { xs: "1.2rem", sm: "" } }}
                    >
                        Shop Photo
                    </Button>
                </label>
                {/* Agreement photo input */}
                <input
                    accept="image/*"
                    capture="environment" // back camera for shop image
                    style={{ display: "none" }}
                    id="agreement-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "agreement")}
                />
                <label htmlFor="agreement-upload">
                    <Button
                        variant="contained"
                        component="span"
                        color="secondary"
                        width="100%"
                        fontSize="1.2rem"
                        sx={{ fontSize: { xs: "1.2rem", sm: "" } }}
                    >
                        Agreement Photo
                    </Button>
                </label>
            </Box>

            {/* Preview */}
            <Box
                mt={2}
                display="flex"
                flexDirection="row"
                gap={2}
                alignItems="center"
            >
                {images.customer && (
                    <Box>
                        <h3>Customer Photo:</h3>
                        <img
                            src={images.customer}
                            alt="customer"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />
                    </Box>
                )}

                {images.shop && (
                    <Box>
                        <h3>Shop Photo:</h3>
                        <img
                            src={images.shop}
                            alt="shop"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />
                    </Box>
                )}
                {images.agreement && (
                    <Box>
                        <h3>Agreement Photo:</h3>
                        <img
                            src={images.agreement}
                            alt="shop"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />
                    </Box>
                )}
            </Box>
        </Box>
    );
}
