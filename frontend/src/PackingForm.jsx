import React, { useState, useEffect, useRef, Suspense, useMemo } from "react";
const DataTable = React.lazy(() => import("./table"));
import { useParams, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import TextInput from "./Textfield";
import {
    Container,
    Typography,
    TextField,
    // TextInput,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    MenuItem,
    Grid,
    Divider,
    Box,
    useTheme,
    FormHelperText,
    FormControl,
} from "@mui/material";

import { takeScreenShot } from "./fuctions";

import {
    AddCircleOutline,
    DeleteOutline,
    Print,
    SignalCellularNull,
    TryOutlined,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";
import PackingList from "./packingList";
import useLocalStorageState from "use-local-storage-state";

const theme = createTheme({
    palette: {
        primary: {
            main: "#2d3436",
        },
        secondary: {
            main: "#0984e3",
        },
    },
    typography: {
        fontFamily: "Poppins, Arial, sans-serif",
    },
});

const productDetail = [
    { label: "qty", size: 1 },
    { label: "T.Q", size: 1 },
    { label: "Product", align: "right" },
];

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

const persons = [
    "زین",
    "m.زین",
    "حسن",
    "اسد",
    "گورو",
    "سبحان",
    "سائم",
    "ذیشان",
    "فخر",
    "احسن"
];
// or fetched list

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

// invoice model
const PackingForm = ({ name = "ESTIMATE" }) => {
    const [invoice, setInvoice] = useState({ items: [] });
    const [customer, setCustomer] = useState([]);
    const [loading, setLoading] = useState(false)
    const [products, setProducts] = useState([]);
    const navigator = useNavigate();


    const [qty, setqty] = useState(0);
    const [updatedInvoice, setUpdatedInvoice] = useLocalStorageState(
        "packingQTY",
        {
            defaultValue: [],
        }
    );
    const [empty, setEmpty] = useState(false)
    const [updatedInvoices, setUpdatedInvoices] = useLocalStorageState(
        "updatedInvoices",
        {
            defaultValue: [],
        }
    );
    const nugRef = useRef(null);
    const packedByRef = useRef(null);
    const { id } = useParams();
    const [initialAmount, setInitialAmount] = useState(0);
    const user = useState(() => {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    });

    const location = useLocation();
    const cameFromOrderPage = location.state?.fromOrderPage === true;
    const targetRef = useRef();
    const [isReady, setIsReady] = useState(false);
    const [person, setPerson] = useLocalStorageState("person", {});
    const [nug, setNug] = useLocalStorageState('nug', {});
    const rowRefs = useRef({}); // Ref for the first row input


    const navigationType = useNavigationType();

    useEffect(() => {
        const invoiceURL = location.pathname;

        if (!cameFromOrderPage || !targetRef.current || !invoiceURL) return;

        const key = `screenshot_taken_${invoiceURL}`;
        const alreadyTaken = sessionStorage.getItem(key);

        if (!alreadyTaken) {
            sessionStorage.setItem(key, "true"); // Mark as taken

            setTimeout(() => {
                takeScreenShot(targetRef);
            }, 1500);
        }

        // ✅ WhatsApp always opens regardless of screenshot status
        let phoneNumber;

        if (customer?.Number) {
            const localNumber = String(customer.Number).trim();
            const raw = localNumber.startsWith("0")
                ? "92" + localNumber.slice(1)
                : localNumber;
            phoneNumber = raw.replace(/\D/g, "");
        } else {
            console.warn("Customer number missing, using fallback.");
        }

        const message = encodeURIComponent("");
        const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(whatsappURL, "_blank");
    }, [cameFromOrderPage, isReady, location.pathname, customer]);

    useEffect(() => {
        return () => {
            // ✅ This runs when the user navigates away (back/forward or to another route)
            console.log("User left MyPage");
            // unlock invoicce
            handleUnlock(id)
        };
    }, [id]);

    useEffect(() => {
        if (navigationType === "POP") {
            // This fires on back/forward
            console.log("Back/Forward pressed on MyPage");
            handleUnlock(id);
        }
    }, [navigationType, id, location]);

    const handleUnlock = async (id) => {
        const unlock = `/${id}/unlock`;
        await axios.put(`${invoiceAPI}${unlock}`);
    }

    useEffect(() => {
        const freight = customer?.Frieght || 0;
        const extra = customer?.Extra || 0;
        const invoiceAmount = customer?.InvoiceAmount || 0;
        const amount = invoiceAmount - freight + extra;

        if (extra || freight) {
            setInitialAmount(amount);
        } else {
            setInitialAmount(0);
        }
    }, [invoice]);

    useEffect(() => {
        // console.log("getting the invoice");
        setInvoice([]);
        setProducts([]);
        setCustomer({});
        const getInvoice = async () => {
            const response = await axios.get(`${invoiceAPI}/${id}`, {
                params: { user: user.username, type: user.userType, page: "pack" },
            });

            await setInvoice(response.data);
            await setCustomer(response.data.Customer);
            await setProducts(response.data.Products);

            if (products.length > 1) {
                setEmpty(true)
            }
        };
        getInvoice();
    }, [id]);

    useEffect(() => {
        if (customer.nug)
            setNug(prev => {
                const value = customer.nug;
                console.log('value', value)
                const updated = {
                    ...prev,
                    [id]: value
                }
                return updated;
            }
            )

    }, [customer]); // Ensure this effect runs only once

    useEffect(() => {
        const now = new Date();
        const midnight = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1,
            0,
            0,
            0
        ); // Midnight tonight
        const timeUntilMidnight = midnight.getTime() - now.getTime();

        const timeoutId = setTimeout(() => {
            const newCurrentDate = new Date(); // Get updated current date to prevent date going stale
            const newYear = newCurrentDate.getFullYear();
            const newMonth = String(newCurrentDate.getMonth() + 1).padStart(2, "0");
            const newDay = String(newCurrentDate.getDate()).padStart(2, "0");
            setFormattedDate(`${newYear}-${newMonth}-${newDay}`);
        }, timeUntilMidnight);

        return () => clearTimeout(timeoutId); // Cleanup the timeout on unmount
    }, []); // Empty dependency array means this only runs once

    // Define rows first (outside JSX)
    const rows = [
        ["Amount:", initialAmount],
        ["FREIGHT:", customer.Frieght],
        ["EXTRA:", customer.Extra],
        ["TOTAL AMOUNT:", customer.InvoiceAmount],
    ].filter(([label, value]) =>
        label.toLowerCase().includes("total") ? value : value > 0
    ); // Only include if value > 0
    const memoizedColumns = useMemo(() => {
        return productDetail.map((field) => ({
            id: field.label.toLowerCase(),
            label: field.label,
            align: "center",
            width:
                field.label === "Product"
                    ? "25%"
                    : field.label === "FOC"
                        ? "2%"
                        : field.label === "Price"
                            ? "10%"
                            : field.label === "Amount"
                                ? "5%"
                                : "5%", // Reduced Amount column width to 8%
            minWidth: field.label === "Product" ? 178 : "5%", // Adjusted minimum width for Product column
            render: (value, row) => {
                let displayValue = "";
                if (!row) <Skeleton height={30} width="80%" />;
                if (field.label === "Product") {
                    displayValue = ` ${row.Product?.toUpperCase() || "error"
                        }`;
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
                const isEditable = field.label === "qty";

                const index = updatedInvoice.findIndex(
                    (item) => String(item.psid) === String(row.psid)
                );
                const isFit = row.Company?.toLowerCase().includes("fit");
                const isSTG = row.Company?.toLowerCase().includes("stg");
                const isStrong =
                    row.Company?.toLowerCase().includes("strong");

                const comapnyColor = isStrong
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
                            inputRef={(el) => {
                                if (el && row.psid && isEditable)
                                    rowRefs.current[row.psid] = el;
                            }}
                            multiline={!isEditable && field.label === "Product"} // Only wrap when not editable
                            value={
                                isEditable
                                    ? updatedInvoice[index]?.qty ?? "" // Use updated value if exists, else original
                                    : displayValue
                            }
                            type={
                                [
                                    "Qty",
                                    "Price",
                                    "Discount",
                                    "BILL",
                                ].includes(field.label)
                                    ? "number"
                                    : "text"
                            }
                            InputProps={{
                                disableUnderline: isEditable ? false : true,
                                disabled: !isEditable,
                                startAdornment:
                                    field.label === "Product" ? (
                                        <Box
                                            sx={{
                                                minWidth: "120px", // ⬅️ Increase this as needed
                                                paddingRight: "0.5rem",
                                                // color: "white !important",
                                            }}
                                        >
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    fontWeight: "bold",
                                                    fontSize: "1.2rem",
                                                    color: "black",
                                                    // fontFamily: "Jameel Noori Nastaleeq, serif",
                                                }}
                                            >
                                                {row.Category?.toUpperCase()}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontWeight: "bold",
                                                    // fontFamily: "Jameel Noori Nastaleeq, serif",
                                                    backgroundColor: comapnyColor,
                                                    color: "white !important",
                                                    fontSize: "1.2rem",
                                                }}
                                            >
                                                {row.Company?.toUpperCase()}
                                            </Typography>

                                        </Box>
                                    ) : undefined,
                                sx: {
                                    backgroundColor: isEditable
                                        ? "#d1ffbd"
                                        : "transparent",
                                    fontWeight: "bold",
                                    fontFamily: "Jameel Noori Nastaleeq, serif",
                                    fontSize:
                                        field.label === "Product" ? "2rem" : "1.5rem",
                                    color: "black",
                                    "&.Mui-disabled": {
                                        // WebkitTextFillColor: "black !important", // Overrides the greyed-out default
                                        // color: "black",
                                    },
                                    "& .MuiInputBase-input": {
                                        fontWeight: "bold", // Input text
                                        letterSpacing: "normal", // 👈 adjust this value as needed     // Input text center
                                    },
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        fontWeight: "bold",
                                        WebkitTextFillColor: "black !important",
                                        // fontSize will be inherited from above or can be set explicitly
                                    },
                                },
                            }}
                            onFocus={(e) => {
                                e.target.select(); // Select the text on focus
                            }}
                            inputProps={{
                                lang: "ur",
                                // dir: isEditable ? "ltr" : "rtl",
                                inputMode: isEditable ? "decimal" : "",
                                step: "any",
                                sx: {
                                    textAlign:
                                        field.label === "Product"
                                            ? "RIGHT"
                                            : "center",
                                    fontSize:
                                        field.label === "Product" ? "2rem" : "1em",
                                    whiteSpace: "normal", // Enable text wrapping
                                    // wordWrap: "break-word", // Break long words
                                    backgroundColor: isEditable
                                        ? "#d1ffbd"
                                        : "transparent",
                                    // color: isEditable ? "#fff" : "#000",
                                    border: isEditable ? "1px solid #ccc" : "none",
                                    fontWeight: "bold",
                                    color: "black",
                                    //   fontFamily:
                                    //     "Jameel Noori Nastaleeq, serif !important",
                                    // fontFamily: "'Noto Nastaliq Urdu', serif",
                                    "& .Mui-disabled": {
                                        fontWeight: "bold",
                                        textAlign: "right",
                                        WebkitTextFillColor: "black !important",
                                    },
                                },
                            }}
                            onChange={(e) => {
                                if (!isEditable) return;
                                console.log("Raw input:", e.target.value);



                                if (e.target.value === displayValue) return

                                const qty = e.target.value;
                                console.log("Typed value:", qty);
                                console.log("Parsed value:", parseFloat(qty));
                                const now = new Date();
                                now.setHours(now.getHours() + 5); // ✅ Add 5 hours
                                const dateTime = now
                                    .toISOString()
                                    .slice(0, 19)
                                    .replace("T", " ");
                                setqty(qty);

                                setUpdatedInvoice((prev) => {
                                    const existingIndex = prev.findIndex(
                                        (item) => item.psid === row.psid
                                    );
                                    const updatedItem = {
                                        invoice: id,
                                        prid: row.prid,
                                        psid: row.psid,
                                        qty: (qty),
                                        dateTime,
                                        user: user[0].username,
                                    };

                                    let updated = [...prev];
                                    if (existingIndex !== -1) {
                                        updated[existingIndex] = updatedItem;
                                    } else {
                                        updated.push(updatedItem);
                                    }

                                    // 🧠 Update localStorage with current invoice data
                                    setUpdatedInvoices((allInvoices) => {
                                        const invoices = updated.filter((item) => item.invoice === id && item.qty !== row.TQ);

                                        return {
                                            ...allInvoices,
                                            [id]: invoices, // ✅ store separately per invoice
                                        };
                                    });

                                    return updated;
                                });
                            }}
                            sx={{
                                width: "100%",
                            }}
                        />
                        {field.label === "Product" && (
                            <Box
                                sx={{
                                    display: "flex",
                                    flexDirection: "row",
                                    alignItems: "flex-end",
                                    justifyContent: "space-between",
                                    height: "100%",
                                }}
                            >
                                {/* STOCKQTY */}
                                <Typography
                                    sx={{
                                        fontWeight: "bold",
                                        // fontFamily: "Jameel Noori Nastaleeq, serif",
                                        // backgroundColor: comapnyColor,
                                        color: "black !important",
                                        fontSize: "1rem",
                                        minWidth: 120,
                                        border: "1px solid black",
                                    }}
                                >
                                    {row.StockQTY || "0"}
                                </Typography>
                                {row.SchPcs > 0 && (
                                    <Typography
                                        sx={{
                                            fontFamily: "Jameel Noori Nastaleeq, serif",
                                            fontSize: "1.2rem",
                                            textAlign: "right",
                                            color: "#666",
                                            lineHeight: 1,
                                            //   mt: "2px", // minimal spacing
                                        }}
                                    >
                                        {row.SchOn} + {row.SchPcs}
                                    </Typography>
                                )}
                            </Box>
                        )}
                    </Box>
                );
            },
        }))
    }, [productDetail]);

    const handleUpdate = async () => {
        if (!updatedInvoices[id]) {
            alert("missing invoice data");
            return;
        }
        setLoading(true)
        const now = new Date();
        now.setHours(now.getHours() + 5); // ✅ Shift time first

        const time = now.toISOString().slice(0, 19).replace("T", " ");
        if (!nug) {
            nugRef.current?.focus();
            return;
        } // Focus NUG if empty
        if (!person) {
            packedByRef.current?.focus();
            return;
        } // Focus NUG if empty

        const body = {
            invoice: id,
            updatedInvoice: updatedInvoices[id],
            nug: nug[id] ?? "",
            tallyBy: person[id] ?? "",
            time,
            acid: customer?.Acid || "",
        }

        try {
            // Update api
            await axios.put(`${invoiceAPI}/${id}/update`, body);

            // SUCCEEDED
            const data = [...updatedInvoices[id]];
            delete data[id]

            setUpdatedInvoices(data);
            setLoading(false)

            alert("Packing updated successfully");

            navigator("/pending");

        } catch (error) {
            setLoading(false)
            alert(error)
        }

    };

    return (
        <ThemeProvider theme={theme}>
            <Container
                disableGutters
                maxWidth="lg"
                // margin="auto"
                sx={{ overflowX: "hidden", p: 0, mx: "auto" }}
            >
                <Paper elevation={3} sx={{ px: 0, m: 0, width: "100%" }}>
                    <Box ref={targetRef} sx={{ p: 1 }}>
                        <Grid
                            container
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 0 }}
                        >
                            <Grid item sx={{ width: "25%" }}>
                                <Typography variant="h6" color="text.secondary">
                                    {name} #
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary">
                                    {customer?.InvoiceNumber}
                                    {!customer?.InvoiceNumber && (
                                        <Skeleton height={30} width="90%" />
                                    )}
                                </Typography>
                            </Grid>

                            {/* Customer Details */}
                            <Box>
                                <Typography
                                    variant="h5"
                                    // fontWeight="bold"
                                    alignSelf="center"
                                    sx={{
                                        fontWeight: "bold",
                                        fontSize: { xs: "3rem", sm: "4rem" },
                                        textAlign: "center",
                                        margin: "auto",
                                        fontFamily: "Jameel Noori Nastaleeq, serif !important",
                                    }}
                                >
                                    {customer?.CustomerName}
                                    {!customer?.CustomerName && (
                                        <Skeleton height={30} width="90%" />
                                    )}
                                </Typography>
                            </Box>
                            <Grid item xs={12} sx={{ width: { xs: "23%" } }}>
                                <TextField
                                    size="small"
                                    label="Date"
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: {
                                            backgroundColor: "white",
                                        },
                                    }}
                                    value={
                                        customer?.InvoiceDate
                                            ? new Date(customer.InvoiceDate)
                                                .toLocaleDateString("en-GB")
                                                .replace(/\//g, "-")
                                            : ""
                                    }
                                    sx={{
                                        "& .MuiOutlinedInput-root": {
                                            border: "1px solid black",
                                            borderRadius: "1rem",
                                            fontSize: "1rem",
                                            fontWeight: "bold",
                                            textAlign: "center",
                                        },
                                        "& .MuiOutlinedInput-notchedOutline": {
                                            border: "none", // optional: remove double-border effect
                                        },
                                        outline: "none", // This has no visible effect here
                                    }}
                                />
                            </Grid>
                        </Grid>

                        <Divider sx={{ mb: 1 }} />

                        {/* Products List Table */}
                        <Grid item xs={12} sx={{ marginTop: 3 }}>
                            <Suspense
                                fallback={
                                    <Box p={2}>
                                        <Skeleton height={30} width="90%" />
                                        <Skeleton height={30} width="70%" />
                                        <Skeleton height={30} width="80%" />
                                    </Box>
                                }
                            >
                                {empty && (
                                    <Typography>not found</Typography>
                                )}
                                {!empty && (
                                    <DataTable
                                        data={products ?? []} // Ensure items is always an array
                                        handleDoubleClick={(prid, psid, value) => {

                                            const index = updatedInvoice.findIndex(
                                                (item) => String(item.psid) === String(psid)
                                            );
                                            if (updatedInvoice[index]?.qty) return
                                            const dateTime = new Date();
                                            setUpdatedInvoice((prev) => {
                                                const existingIndex = prev.findIndex(
                                                    (item) => item.psid === psid
                                                );
                                                const updatedItem = {
                                                    invoice: id,
                                                    prid: prid,
                                                    psid: psid,
                                                    qty: (value),
                                                    dateTime,
                                                    user: user[0].username,
                                                };

                                                let updated = [...prev];
                                                if (existingIndex !== -1) {
                                                    updated[existingIndex] = updatedItem;
                                                } else {
                                                    updated.push(updatedItem);
                                                }

                                                // 🧠 Update localStorage with current invoice data
                                                setUpdatedInvoices((allInvoices) => {
                                                    const invoices = updated.filter((item) => item.invoice === id);

                                                    return {
                                                        ...allInvoices,
                                                        [id]: invoices, // ✅ store separately per invoice
                                                    };
                                                });

                                                return updated;
                                            });
                                        }}
                                        onLoad={() => setIsReady(true)}
                                        columns={productDetail.map((field) => ({
                                            id: field.label.toLowerCase(),
                                            label: field.label,
                                            align: "center",
                                            width:
                                                field.label === "Product"
                                                    ? "25%"
                                                    : field.label === "FOC"
                                                        ? "2%"
                                                        : field.label === "Price"
                                                            ? "10%"
                                                            : field.label === "Amount"
                                                                ? "5%"
                                                                : "5%", // Reduced Amount column width to 8%
                                            minWidth: field.label === "Product" ? 178 : "5%", // Adjusted minimum width for Product column
                                            render: (value, row) => {
                                                let displayValue = "";
                                                if (!row) <Skeleton height={30} width="80%" />;
                                                if (field.label === "Product") {
                                                    displayValue = ` ${row.Product?.toUpperCase() || "error"
                                                        }`;
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
                                                const isEditable = field.label === "qty";

                                                const index = updatedInvoice.findIndex(
                                                    (item) => String(item.psid) === String(row.psid)
                                                );
                                                const isFit = row.Company?.toLowerCase().includes("fit");
                                                const isSTG = row.Company?.toLowerCase().includes("stg");
                                                const isStrong =
                                                    row.Company?.toLowerCase().includes("strong");

                                                const comapnyColor = isStrong
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
                                                            inputRef={(el) => {
                                                                if (el && row.psid && isEditable)
                                                                    rowRefs.current[row.psid] = el;
                                                            }}
                                                            multiline={!isEditable && field.label === "Product"} // Only wrap when not editable
                                                            value={
                                                                isEditable
                                                                    ? updatedInvoice[index]?.qty ?? "" // Use updated value if exists, else original
                                                                    : displayValue
                                                            }
                                                            type={
                                                                [
                                                                    "Qty",
                                                                    "Price",
                                                                    "Discount",
                                                                    "BILL",
                                                                ].includes(field.label)
                                                                    ? "number"
                                                                    : "text"
                                                            }
                                                            InputProps={{
                                                                disableUnderline: isEditable ? false : true,
                                                                disabled: !isEditable,
                                                                startAdornment:
                                                                    field.label === "Product" ? (
                                                                        <Box
                                                                            sx={{
                                                                                minWidth: "120px", // ⬅️ Increase this as needed
                                                                                paddingRight: "0.5rem",
                                                                                // color: "white !important",
                                                                            }}
                                                                        >
                                                                            <Typography
                                                                                variant="body1"
                                                                                sx={{
                                                                                    fontWeight: "bold",
                                                                                    fontSize: "1.2rem",
                                                                                    color: "black",
                                                                                    // fontFamily: "Jameel Noori Nastaleeq, serif",
                                                                                }}
                                                                            >
                                                                                {row.Category?.toUpperCase()}
                                                                            </Typography>
                                                                            <Typography
                                                                                sx={{
                                                                                    fontWeight: "bold",
                                                                                    // fontFamily: "Jameel Noori Nastaleeq, serif",
                                                                                    backgroundColor: comapnyColor,
                                                                                    color: "white !important",
                                                                                    fontSize: "1.2rem",
                                                                                }}
                                                                            >
                                                                                {row.Company?.toUpperCase()}
                                                                            </Typography>

                                                                        </Box>
                                                                    ) : undefined,
                                                                sx: {
                                                                    backgroundColor: isEditable
                                                                        ? "#d1ffbd"
                                                                        : "transparent",
                                                                    fontWeight: "bold",
                                                                    fontFamily: "Jameel Noori Nastaleeq, serif",
                                                                    fontSize:
                                                                        field.label === "Product" ? "2rem" : "1.5rem",
                                                                    color: "black",
                                                                    "&.Mui-disabled": {
                                                                        // WebkitTextFillColor: "black !important", // Overrides the greyed-out default
                                                                        // color: "black",
                                                                    },
                                                                    "& .MuiInputBase-input": {
                                                                        fontWeight: "bold", // Input text
                                                                        letterSpacing: "normal", // 👈 adjust this value as needed     // Input text center
                                                                    },
                                                                    "& .MuiInputBase-input.Mui-disabled": {
                                                                        fontWeight: "bold",
                                                                        WebkitTextFillColor: "black !important",
                                                                        // fontSize will be inherited from above or can be set explicitly
                                                                    },
                                                                },
                                                            }}
                                                            onFocus={(e) => {
                                                                e.target.select(); // Select the text on focus
                                                            }}
                                                            inputProps={{
                                                                lang: "ur",
                                                                // dir: isEditable ? "ltr" : "rtl",
                                                                inputMode: isEditable ? "decimal" : "",
                                                                step: "any",
                                                                sx: {
                                                                    textAlign:
                                                                        field.label === "Product"
                                                                            ? "RIGHT"
                                                                            : "center",
                                                                    fontSize:
                                                                        field.label === "Product" ? "2rem" : "1em",
                                                                    whiteSpace: "normal", // Enable text wrapping
                                                                    // wordWrap: "break-word", // Break long words
                                                                    backgroundColor: isEditable
                                                                        ? "#d1ffbd"
                                                                        : "transparent",
                                                                    // color: isEditable ? "#fff" : "#000",
                                                                    border: isEditable ? "1px solid #ccc" : "none",
                                                                    fontWeight: "bold",
                                                                    color: "black",
                                                                    //   fontFamily:
                                                                    //     "Jameel Noori Nastaleeq, serif !important",
                                                                    // fontFamily: "'Noto Nastaliq Urdu', serif",
                                                                    "& .Mui-disabled": {
                                                                        fontWeight: "bold",
                                                                        textAlign: "right",
                                                                        WebkitTextFillColor: "black !important",
                                                                    },
                                                                },
                                                            }}
                                                            onChange={(e) => {
                                                                if (!isEditable) return;
                                                                console.log("Raw input:", e.target.value);



                                                                if (e.target.value === displayValue) return

                                                                const qty = e.target.value;
                                                                console.log("Typed value:", qty);
                                                                console.log("Parsed value:", parseFloat(qty));
                                                                const now = new Date();
                                                                now.setHours(now.getHours() + 5); // ✅ Add 5 hours
                                                                const dateTime = now
                                                                    .toISOString()
                                                                    .slice(0, 19)
                                                                    .replace("T", " ");
                                                                setqty(qty);

                                                                setUpdatedInvoice((prev) => {
                                                                    const existingIndex = prev.findIndex(
                                                                        (item) => item.psid === row.psid
                                                                    );
                                                                    const updatedItem = {
                                                                        invoice: id,
                                                                        prid: row.prid,
                                                                        psid: row.psid,
                                                                        qty: (qty),
                                                                        dateTime,
                                                                        user: user[0].username,
                                                                    };

                                                                    let updated = [...prev];
                                                                    if (existingIndex !== -1) {
                                                                        updated[existingIndex] = updatedItem;
                                                                    } else {
                                                                        updated.push(updatedItem);
                                                                    }

                                                                    // 🧠 Update localStorage with current invoice data
                                                                    setUpdatedInvoices((allInvoices) => {
                                                                        const invoices = updated.filter((item) => item.invoice === id && item.qty !== row.TQ);

                                                                        return {
                                                                            ...allInvoices,
                                                                            [id]: invoices, // ✅ store separately per invoice
                                                                        };
                                                                    });

                                                                    return updated;
                                                                });
                                                            }}
                                                            sx={{
                                                                width: "100%",
                                                            }}
                                                        />
                                                        {field.label === "Product" && (
                                                            <Box
                                                                sx={{
                                                                    display: "flex",
                                                                    flexDirection: "row",
                                                                    alignItems: "flex-end",
                                                                    justifyContent: "space-between",
                                                                    height: "100%",
                                                                }}
                                                            >
                                                                {/* STOCKQTY */}
                                                                <Typography
                                                                    sx={{
                                                                        fontWeight: "bold",
                                                                        // fontFamily: "Jameel Noori Nastaleeq, serif",
                                                                        // backgroundColor: comapnyColor,
                                                                        color: "black !important",
                                                                        fontSize: "1rem",
                                                                        minWidth: 120,
                                                                        border: "1px solid black",
                                                                    }}
                                                                >
                                                                    {row.StockQTY || "0"} - ({row.Size || "--"})
                                                                </Typography>
                                                                {row.SchPcs > 0 && (
                                                                    <Typography
                                                                        sx={{
                                                                            fontFamily: "Jameel Noori Nastaleeq, serif",
                                                                            fontSize: "1.2rem",
                                                                            textAlign: "right",
                                                                            color: "#666",
                                                                            lineHeight: 1,
                                                                            //   mt: "2px", // minimal spacing
                                                                        }}
                                                                    >
                                                                        {row.SchOn} + {row.SchPcs}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Box>
                                                );
                                            },
                                        }))}
                                        rowKey="id"
                                        apiEndpoint="invoices"
                                        sx={{
                                            "& .MuiTableCell-root": {
                                                border: "5px solid #ddd",
                                                padding: ".25rem",
                                                boxSizing: "border-box",
                                            },
                                            width: "100%",
                                            // tableLayout: "fixed",
                                        }}
                                    />
                                )}
                            </Suspense>
                        </Grid>
                        {/* Notes Section */}
                        <TextField
                            label="NUG"
                            variant="outlined"
                            inputRef={nugRef}
                            // size={"small"}
                            maxWidth={20}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{
                                inputMode: "numeric",
                            }}
                            sx={{
                                m: 3,
                                width: "100px", // ⬅️ Adjust this to your desired width
                            }}
                            // value={(id && nug && nug[id] !== undefined) ? nug[id] : ''}
                            value={nug?.[id] || ''}

                            onChange={(e) =>
                                setNug(prev => {
                                    const value = e.target.value;
                                    const updated = {
                                        ...prev,
                                        [id]: value
                                    }
                                    return updated;
                                }
                                )
                            }
                        />
                        <TextField
                            label="PACKED BY"
                            variant="outlined"
                            inputRef={packedByRef}
                            select
                            InputLabelProps={{ shrink: true }}
                            value={(id && person && person[id] !== undefined) ? person[id] : ''}

                            onChange={(e) => setPerson(prev => {
                                const value = e.target.value;
                                const updated = {
                                    ...prev,
                                    [id]: value
                                }
                                return updated;
                            }
                            )}
                            sx={{
                                my: 3,
                                width: "200px",
                                direction: "rtl",
                                "& .MuiSelect-select": {
                                    textAlign: "right",
                                    direction: "rtl",
                                    fontFamily: "Jameel Noori Nastaleeq, serif",
                                    fontSize: "1.5rem",
                                    fontWeight: "bold",
                                    color: "black",
                                },
                            }}
                            SelectProps={{
                                MenuProps: {
                                    PaperProps: {
                                        sx: {
                                            direction: "rtl",
                                            "& .MuiMenuItem-root": {
                                                justifyContent: "flex-end", // Right-align menu item content
                                                textAlign: "right",
                                            },
                                        },
                                    },
                                },
                            }}
                        >
                            {persons.map((name, index) => (
                                <MenuItem
                                    key={index}
                                    value={name}
                                    sx={{
                                        fontFamily: "Jameel Noori Nastaleeq, serif",
                                        fontSize: "1.5rem",
                                        color: "black",
                                        fontWeight: "bold",
                                        borderBottom: "1px solid #ddd",
                                        padding: "8px 16px",
                                        textAlign: "right",
                                        width: "100%", // Needed for full alignment
                                        display: "flex",
                                        justifyContent: "flex-end", // ✅ Align right
                                        direction: "rtl", // ✅ Optional but helps for Urdu
                                    }}
                                >
                                    {name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Box>
                    {/* print Order Button */}
                    <Box sx={{ mt: 3, textAlign: "center" }}>
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            disabled={loading}
                            onClick={handleUpdate}
                            sx={{ minWidth: "300px", fontSize: "2rem", frontWeight: "bold" }}
                        >
                            UPDATE
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </ThemeProvider>
    );
};

export default PackingForm;
