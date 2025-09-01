import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    Tabs,
    Tab,
    Box,
    Typography,
    TextField,
    Button,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from "@mui/material";
import axios from "axios";
const url = import.meta.env.VITE_API_URL;

import TabPanel from "./components/TabPanel";
import MyAutocomplete from "./components/MyAutocomplete";
import DiscountForm from "./components/DiscountForm";
import DiscountList from "./components/DiscountList";
import DualCameraUpload from "./components/DualCameraUpload";
import { cleanString } from "./utils/cleanString";
import { useLocalStorageState } from "./hooks/LocalStorage";
import { useCamera } from "./hooks/useCamera";

const fields = ["Name", "Urdu name", "Address", "Route", "Phone Number", "Whatsapp", "Credit Days", "Credit Limit"];
const discountOptions = ["d1", "d2"];
const types = ["Customer", "Prospect", "Workshop"];

export default function CreateCustomer({ onCustomerCreated, accounts, urdu }) {
    const [formData, setFormData] = useLocalStorageState('coaform', {})
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([]);
    const [listOptions, setListOptions] = useState([]);
    const [discount, setDiscount] = useState(null);
    const [discountList, setDiscountList] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const user = JSON.parse(localStorage.getItem("user"));

    const { images, handleImageChange, resetImages } = useCamera()
    useEffect(() => {
        setCompanyOptions(["fit", "excel", "strong"]);
        setListOptions(["A", "B"]);
    }, []);

    const discountFields = [
        { label: "Company", options: companyOptions },
        { label: "List", options: listOptions },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const handleAddDiscount = () => {
        if (discount && Object.values(discount).some((v) => v)) {
            const keyOrder = ["company", "list", "d1", "d2"];
            const ordered = {};
            keyOrder.forEach((key) => {
                if (key in discount) ordered[key] = discount[key];
            });
            setDiscountList((prev) => [...prev, ordered]);
            setDiscount(null);
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        try {
            // 1. Ask backend for the new id
            const { data } = await axios.get(`${url}/customers/newAcid`);
            const acid = data.acid;

            console.log("acid", acid, data)
            const finalFormData = {
                ...formData,
                discounts: discountList,
                username: user.username,
                acid,
            };

            // 2. Call both APIs in parallel with the same id
            await Promise.all([
                await axios.post(`${url}/customers/create`, finalFormData, {
                    headers: { "Content-Type": "application/json" },
                }),
                axios.post(`${url}/customers/createImages`, { ...images, acid }),
            ]);


            resetImages()
            onCustomerCreated();
            setFormData({});
            setDiscountList([]);
        } catch (error) {
            console.error("Error creating customer:", error);
            alert("Failed to create account.");
        }
    };

    return (
        <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
                {/* Tabs */}
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    TabIndicatorProps={{ style: { display: "none" } }}
                >
                    <Tab label="create" />
                    <Tab label="update" />
                </Tabs>

                {/* CREATE */}
                <TabPanel value={tabValue} index={0}>
                    <Box component="form" onSubmit={handlePost}>
                        {/* Fields */}
                        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.5 }}>
                            {fields.map((field) =>
                                field.toLowerCase().includes("name") ? (
                                    <MyAutocomplete
                                        key={field}
                                        formData={{ name: formData.name, urduname: formData.urduname }}
                                        field={field}
                                        accounts={accounts}
                                        urdu={urdu}
                                        errors={errors}
                                        cleanString={cleanString}
                                        handleChange={handleChange}
                                    />
                                ) : (
                                    <TextField
                                        key={field}
                                        label={field}
                                        name={cleanString(field)}
                                        value={formData[cleanString(field)] || ""}
                                        onChange={handleChange}
                                        fullWidth
                                        size="small"
                                    />
                                )
                            )}
                        </Box>

                        {/* Type */}
                        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                            <InputLabel id="type-label">Type</InputLabel>
                            <Select
                                labelId="type-label"
                                value={formData.type || ""}
                                name="type"
                                onChange={handleChange}
                            >
                                {types.map((t, i) => (
                                    <MenuItem key={i} value={t}>
                                        {t}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Discounts */}
                        <Divider sx={{ my: 2 }}>
                            <Typography variant="body1">Discounts</Typography>
                        </Divider>

                        <DiscountForm
                            discount={discount}
                            setDiscount={setDiscount}
                            discountFields={discountFields}
                            discountOptions={discountOptions}
                            handleAdd={handleAddDiscount}
                            cleanString={cleanString}
                        />
                        <DiscountList discountList={discountList} />

                        {/* Upload */}
                        <DualCameraUpload images={images} handleImageChange={handleImageChange} />

                        {/* Submit */}
                        <Button
                            // onClick={handlePost}
                            type="submit"
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}>
                            Create Account
                        </Button>
                    </Box>
                </TabPanel>
            </CardContent>
        </Card>
    );
}
