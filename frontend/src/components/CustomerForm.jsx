import axios from "axios";
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

import TabPanel from "./TabPanel";
import DiscountForm from "./DiscountForm";
import DiscountList from "./DiscountList";
import MyAutocomplete from "./MyAutocomplete";
import { useCamera } from "../hooks/useCamera";
import DualCameraUpload from "./DualCameraUpload";
import { cleanNumbers, cleanString } from "../utils/cleanString";
import { useDiscount } from "../hooks/useDiscount";
import { formatNumbers } from "../utils/cleanString";
import useFetchCustImgs from "../hooks/useFetchCustImg";
import useUpdateCustomer from "../hooks/useUpdateCustomer";
import { useLocalStorageState } from "../hooks/LocalStorage";
import useGeolocation from "../hooks/geolocation";
import { saveCustomer } from "../utils/api";

const url = import.meta.env.VITE_API_URL;

const discountOptions = ["d1", "d2"];
const types = ["Customer", "Prospect", "Workshop", "CCP"];
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
const editableFields = [
    "Monthly Transaction",
    "Buying Source",
];

export default function CustomerForm({ onCustomerCreated, accounts, urdu }) {
    // LOCAL STATES
    const [formData, setFormData] = useLocalStorageState("coaform", {});
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([]);
    const [listOptions, setListOptions] = useState([]);
    const [discount, setDiscount] = useState(null);
    const [discountList, setDiscountList] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const user = JSON.parse(localStorage.getItem("user"));
    const [name, setName] = useState("");

    // CUSTOM HOOKS
    const { coordinates, address, error: geoError } = useGeolocation();
    const { selectedCustomer, setSelectedCustomer } = useUpdateCustomer(name);
    const { images, setImages, handleImageChange, resetImages } = useCamera();
    const { list, error: disError } = useDiscount(selectedCustomer, null, true);
    useFetchCustImgs(selectedCustomer?.acid, handleImageChange, setImages);

    // PERMISSIONS
    const usertype = user?.userType.toLowerCase();
    const isAdmin = usertype?.includes("admin");
    const isEmpty = (obj) => !obj || Object.keys(obj).length === 0;
    const isAllowed = !isEmpty(selectedCustomer) ? isAdmin : true;

    const discountFields = [
        { label: "Company", options: companyOptions },
        { label: "List", options: listOptions },
    ];

    // useEffects
    useEffect(() => {
        console.log(formData);
    }, [formData]);

    // SYNCING FORM DATA WITH THE SELECTEDCUSTOMER
    useEffect(() => {
        if (selectedCustomer) {
            const { UrduName, ...rest } = selectedCustomer; // take UrduName out
            setFormData(() => ({
                ...rest, // all other fields
                urduname: UrduName, // renamed field
            }));
        }
    }, [selectedCustomer]);

    // SETTING THE INITIAL VALUES FOR THE OPTIONS
    useEffect(() => {
        setCompanyOptions(["FIT-O", "FIT-B", "EXCEL"]);
        setListOptions(["A", "B"]);

        setDiscount((prev) => ({
            ...prev,
            list: "A",
        }));
    }, []);

    const handleReset = () => {
        resetImages();
        setFormData({ name: "", urduname: "" });
        setDiscount(null);
        setDiscountList(null);
        setSelectedCustomer(null);
    };

    // HANDLE HADNLE FORM CHANGE
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    // handle number input string
    const handleNumbers = (e) => {
        const value = formatNumbers(e.target.value);

        handleChange({
            target: {
                name: e.target.name,
                value: value ? value : e.target.value,
            },
        });
    }

    // ADD IN THE DISCOUNT LIST
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

    // HADNLE POST AND UPDATE
    const handlePost = async (e) => {
        e.preventDefault();
        try {
            // 1. Ask backend for the new id
            const { data } = await axios.get(`${url}/customers/newAcid`);
            const acid = data.acid;


            // const {creditlimit , creditdays, monthlytransaction, ...rest } = formData
            // // const {creditlimit , creditdays, monthlytransaction, ...rest } = formData
            const finalFormData = {
                ...formData,
                username: user.username,
                discounts: discountList,
                longitude: coordinates.longitude,
                latitude: coordinates.latitude,
                acid: selectedCustomer?.acid || acid,
            };

            // 2. Call both APIs in parallel with the same id
            const res = await saveCustomer(selectedCustomer, finalFormData, images,);

            console.log("Customer saved:", res);
            resetImages();
            setFormData({});
            onCustomerCreated();
            setDiscountList([]);
            setSelectedCustomer(null)
        } catch (error) {
            console.error("Error creating customer:", error);
            alert("Failed to create account.");
        }
    };

    // SET NAME
    const handleSelect = (n) => {
        setName(n);
    };

    return (
        <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
                {/* Tabs */}
                {/* <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    TabIndicatorProps={{ style: { display: "none" } }}
                >
                    <Tab label="create" />
                    <Tab label="update" />
                </Tabs> */}

                {/* CREATE */}
                <TabPanel value={tabValue} index={0}>
                    <Box component="form" onSubmit={handlePost}>
                        {/* Fields */}
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(2, 1fr)",
                                gap: 1.5,
                            }}
                        >
                            {fields.map((field) =>
                                field.toLowerCase().includes("name") ? (
                                    <MyAutocomplete
                                        key={field}
                                        urdu={urdu}
                                        field={field}
                                        errors={errors}
                                        accounts={accounts}
                                        disabled={false}
                                        onReset={handleReset}
                                        onSelect={handleSelect}
                                        cleanString={cleanString}
                                        handleChange={handleChange}
                                        formData={{
                                            name: formData.name ?? "",
                                            urduname: formData.urduname ?? "",
                                        }}
                                    />
                                ) : (
                                    <TextField
                                        key={field}
                                        label={field}
                                        disabled={!isAllowed}
                                        onChange={handleChange}
                                        name={cleanString(field)}
                                        value={formData[cleanString(field)] || ""}
                                    />
                                )
                            )}
                            {editableFields.map(field => (
                                <TextField
                                    key={field}
                                    label={field}
                                    // disabled={!isAllowed}
                                    onChange={handleNumbers}

                                    name={cleanString(field)}
                                    value={formData[cleanString(field)] || ""}
                                />
                            ))}
                        </Box>

                        {/* Type */}
                        <FormControl fullWidth sx={{ mt: 2 }}>
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
                        <DualCameraUpload
                            images={images}
                            handleImageChange={handleImageChange}
                        />

                        <Box sx={{ display: "flex", justifyContent: "center" }}>
                            {/* Submit */}
                            <Button
                                // onClick={handlePost}
                                type="submit"
                                variant="contained"
                                fullWidth
                                sx={{
                                    mt: 2,
                                    width: "50%",
                                    fontWeight: "bold",
                                    fontSize: "1.5rem",
                                    margin: "auto",
                                }}
                            >
                                Create Account
                            </Button>
                        </Box>
                    </Box>
                </TabPanel>
            </CardContent>
        </Card>
    );
}
