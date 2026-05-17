import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import isEqual from "lodash/isEqual";
import { cleanNumbers, makeStringPrettier } from "./utils/cleanString";

// MUI Components
import {
    Container,
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    IconButton,
    Collapse,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

// Local Component Imports (assuming they are in the same directory or configured path)
import DataTable from "./table";
import { useFetchRemarks } from "./hooks/useFetchRemarks";
import { cleanString } from "./utils/cleanString";

//================================================================================
// 1. CONSTANTS & UTILITIES
//================================================================================

const API_URL = import.meta.env.VITE_API_URL;

// Columns for the remarks table in the dialog
const REMARK_COLUMNS = [
    { id: "remarks", label: "Remarks" },
    {
        label: "Date",
        id: "datetime",
        render: (value) => {
            if (!value) return "N/A";
            const date = new Date(value);
            return `${date.getDate()}/${date.getMonth() + 1}/${String(
                date.getFullYear()
            ).slice(-2)}`;
        },
    },
];

// Fields to display on each trader card
const FIELDS_TO_DISPLAY = [
    "ACID",
    "number",
    "Overdue",
    "Balance",
    "UrduName",
    "Sale",
    "Sale Date",
    "lrecovery",
    "Recovery Date",
    "Credit Days",
    "Credit Limit",
    "Recovery",
    "Turnover Days",
];
const SPECIAL_FIELDS = [
    "Sale",
    "Sale Date",
    "lrecovery",
    "Recovery Date",
    "Overdue",
    "Balance",
    "Credit Days",
    "Credit Limit",
    "ACID",
    "number",
];

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const day = String(date.getDate());
    const month = String(date.getMonth() + 1);
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
};

const isOlderThanOneMonth = (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return date < oneMonthAgo;
};

// ─── Attendance Check-In Button ───────────────────────────────────────────────
const AttendanceCheckIn = React.memo(({ user }) => {
    const [status, setStatus]   = useState("idle"); // idle | loading | done | error
    const [checkedIn, setCheckedIn] = useState(false);
    const [locName, setLocName] = useState("");
    const [checkinTime, setCheckinTime] = useState("");
    const [errMsg, setErrMsg]   = useState("");

    // Check if already checked in today (stored in sessionStorage)
    useEffect(() => {
        const key = `checkin_${user?.username}_${new Date().toISOString().split('T')[0]}`;
        const saved = sessionStorage.getItem(key);
        if (saved) {
            const data = JSON.parse(saved);
            setCheckedIn(true);
            setLocName(data.locationName || "");
            setCheckinTime(data.time || "");
        }
    }, [user?.username]);

    const handleCheckIn = async () => {
        setStatus("loading");
        setErrMsg("");
        try {
            const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 15000 })
            );
            const { latitude, longitude, accuracy } = pos.coords;
            const resp = await fetch(`${API_URL}/tracking/ping`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: user.username, userType: user.userType, latitude, longitude, accuracy, pingType: "checkin" }),
            });
            const data = await resp.json();
            if (data.success) {
                const time = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
                const key = `checkin_${user?.username}_${new Date().toISOString().split('T')[0]}`;
                sessionStorage.setItem(key, JSON.stringify({ locationName: data.locationName, time }));
                setLocName(data.locationName || "");
                setCheckinTime(time);
                setCheckedIn(true);
                setStatus("done");
            } else {
                throw new Error(data.message || "Failed");
            }
        } catch (err) {
            let msg = err.message;
            if (err.code === 1) msg = "Location permission denied. Please allow location access.";
            else if (err.code === 2) msg = "GPS/Location is turned off. Please turn it on and try again.";
            else if (err.code === 3) msg = "Location request timed out. Please try again.";
            
            setErrMsg(msg);
            setStatus("error");
        }
    };

    if (checkedIn) {
        return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 2, borderRadius: 3, bgcolor: "#e8f5e9", border: "2px solid #a5d6a7", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <span style={{ fontSize: "1.8rem" }}>✅</span>
                <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 900, color: "#2e7d32", fontSize: "1.2rem", lineHeight: 1.2 }}>Attendance marked at {checkinTime}</Typography>
                </Box>
            </Box>
        );
    }

    return (
        <Box>
            <Button
                variant="contained"
                onClick={handleCheckIn}
                disabled={status === "loading"}
                sx={{
                    background: status === "error" ? "#c62828" : "linear-gradient(135deg,#1a237e,#283593)",
                    color: "white", fontWeight: 900, borderRadius: 3, px: 5, py: 2.5,
                    fontSize: "1.3rem", textTransform: "none", boxShadow: "0 8px 24px rgba(26,35,126,.4)",
                    width: { xs: "100%", sm: "auto" },
                    "&:hover": { background: "linear-gradient(135deg,#283593,#3949ab)", transform: "translateY(-2px)" },
                    "&:disabled": { background: "#ccc" },
                    transition: "all 0.2s"
                }}
            >
                {status === "loading" ? "📡 Locating..." : "📍 Mark Attendance"}
            </Button>
            {errMsg && <Typography sx={{ color: "#c62828", fontSize: "0.85rem", mt: 1, fontWeight: 700 }}>{errMsg}</Typography>}
        </Box>
    );
});


//================================================================================
// 2. HELPER COMPONENTS (Single Responsibility)
//================================================================================

const DateInput = React.memo(({ onDateChange }) => {
    const [pickerValue, setPickerValue] = useState(
        new Date().toISOString().split("T")[0]
    );

    useEffect(() => {
        onDateChange(pickerValue);
    }, [pickerValue, onDateChange]);

    const handleChange = (e) => setPickerValue(e.target.value);

    return (
        <TextField
            label="Date"
            type="date"
            value={pickerValue}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
        />
    );
});

const StatusFilter = React.memo(({ onFilterChange }) => {
    const [filter, setFilter] = useState("Pending");
    const FILTER_VALUES = [
        "Pending",
        "Done",
        "Payments",
        "Orders",
        "Remarks",
        "All",
    ];

    useEffect(() => {
        onFilterChange(filter);
    }, [filter, onFilterChange]);

    return (
        <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
                value={filter}
                label="Status"
                onChange={(e) => setFilter(e.target.value)}
            >
                {FILTER_VALUES.map((value) => (
                    <MenuItem key={value} value={value}>
                        {value}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
});
// useRemarkDialog.ts

export function useRemarkDialog({ open, acid, name, onSubmitRemark, onClose }) {
    const [remark, setRemark] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const location = useLocation();
    const handleNavigate = useCallback(
        (page) => {
            if (!acid) return;
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 3);
            const currentPath = location.pathname + location.search;
            const url = `/${page}?name=${encodeURIComponent(name || "")}&acid=${encodeURIComponent(
                acid
            )}&startDate=${startDate.toISOString().split("T")[0]}&endDate=${new Date()
                .toISOString()
                .split("T")[0]}&from=${encodeURIComponent(currentPath)}`;
            navigate(url);
        },
        [acid, name, navigate, location.pathname, location.search]
    );

    const handleSubmit = () => {
        if (!remark.trim()) return;
        onSubmitRemark(acid, remark);
        setRemark("");
        onClose();
    };

    return {
        remark,
        setRemark,
        error,
        setError,
        handleNavigate,
        handleSubmit,
    };
}
// RemarkDialogUI.tsx
export const RemarkDialogUI = ({
    open,
    onClose,
    acid,
    name,
    pastRemarks,
    remark,
    setRemark,
    error,
    handleNavigate,
    handleSubmit,
}) => {
    console.log(handleNavigate)
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle>Customer Actions: {acid}</DialogTitle>
            <DialogContent>
                <TextField
                    label="Enter New Remark"
                    fullWidth
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    margin="normal"
                />
                {error && <Typography color="error">{error}</Typography>}
                {pastRemarks?.length > 0 && (
                    <DataTable data={pastRemarks} columns={REMARK_COLUMNS} />
                )}
            </DialogContent>
            <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
                <Box>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("order")}
                        color="primary"
                        sx={{ mr: 1 }}
                    >
                        Order
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("recovery")}
                        color="secondary"
                        sx={{ mr: 1 }}
                    >
                        Recovery
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleNavigate("ledger")}
                        color="warning"
                    >
                        Ledger
                    </Button>
                </Box>
                <Button onClick={handleSubmit} color="success" variant="contained">
                    Submit Remark
                </Button>
            </DialogActions>
        </Dialog>
    );
};
// RemarkDialog.tsx
export const RemarkDialog = React.memo(
    ({ images, open, onClose, acid, name, onSubmitRemark, pastRemarks, onRender, customer, setIsTally, setCustomer, handleNavigate: customHandleNavigate }) => {
        const { remark, setRemark, error, handleNavigate: defaultHandleNavigate, handleSubmit } =
            useRemarkDialog({ open, acid, name, onSubmitRemark, onClose });

        const handleNavigate = customHandleNavigate || defaultHandleNavigate;

        if (!onRender) {
            alert("nothing to  render")
            return null;
        }

        // FIX: Pass the `handleSubmit` function from the hook to the onRender prop.
        // It contains the full logic (calling onSubmitRemark, closing dialog, etc.).
        // Also pass all other relevant values.
        return (
            onRender(images, customer, remark, setRemark, pastRemarks, error, acid, handleNavigate, onSubmitRemark, onClose, setIsTally, setCustomer)
        );
    }
);


const SummaryBar = React.memo(
    ({ summary, userRoles, onParamsChange, onFetch, isLoading, spoUser }) => {
        const [showBox, setShowBox] = useState(true);
        const { isAdmin, isZain } = userRoles;

        return (
            <Box
                sx={{
                    position: "sticky",
                    top: 55,
                    zIndex: 1000,
                    background: "transparent",
                    mb: 3,
                }}
            >
                {(isAdmin || isZain) && (
                    <Box display="flex" justifyContent="flex-end" mb={1}>
                        <IconButton
                            onClick={() => setShowBox((p) => !p)}
                            sx={{ backgroundColor: "white", p: 1 }}
                        >
                            {showBox ? <Visibility /> : <VisibilityOff />}
                        </IconButton>
                    </Box>
                )}
                <Collapse in={showBox}>
                    <Box
                        sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "white",
                            boxShadow: 3,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                        }}
                    >
                        {/* --- INPUTS --- */}
                        <Box
                            display="grid"
                            gridTemplateColumns={
                                isAdmin || isZain ? "repeat(4, 1fr)" : "repeat(3, 1fr)"
                            }
                            gap={2}
                        >
                            {/* Check-in button for SPO/SM field users */}
                            {!isAdmin && !isZain && spoUser && (
                                <Box sx={{ gridColumn: "span 3" }}>
                                    <AttendanceCheckIn user={spoUser} />
                                </Box>
                            )}
                            {(isAdmin || isZain) && (
                                <DateInput
                                    onDateChange={(val) => onParamsChange("date", val)}
                                />
                            )}
                            <Autocomplete
                                freeSolo
                                options={summary.allData}
                                getOptionLabel={(option) =>
                                    option.Subsidary || option.name || ""
                                }
                                onInputChange={(e, val) => onParamsChange("nameFilter", val)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        variant="outlined"
                                        placeholder="Search by Name"
                                    />
                                )}
                                sx={{ gridColumn: isAdmin || isZain ? "span 3" : "span 3" }}
                            />
                            <TextField
                                label="Route"
                                onChange={(e) => onParamsChange("route", e.target.value)}
                                onFocus={(e) => e.target.select()}
                                sx={{ "& input": { textTransform: "uppercase" } }}
                            />
                            {(isAdmin || isZain) && (
                                <TextField
                                    label="SPO"
                                    onChange={(e) => onParamsChange("spo", e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                />
                            )}
                            <Button
                                variant="contained"
                                onClick={onFetch}
                                disabled={isLoading}
                            >
                                {isLoading ? "Loading..." : "GET"}
                            </Button>
                            <StatusFilter
                                onFilterChange={(val) => onParamsChange("statusFilter", val)}
                            />
                        </Box>

                        {/* --- METRICS --- */}
                        <Box
                            display="grid"
                            gridTemplateColumns={{
                                xs: "repeat(3, 1fr)",
                                md: "repeat(6, 1fr)",
                            }}
                            sx={{
                                border: "2px solid black",
                                "& > div": {
                                    border: "1px solid #ccc",
                                    textAlign: "center",
                                    p: 1,
                                },
                            }}
                        >
                            {[
                                {
                                    label: "Customers",
                                    value: `${summary.actions} / ${summary.totalCount}`,
                                    bgColor: "#e0e0e0",
                                    color: "black",
                                },
                                {
                                    label: "Overdue",
                                    value: formatCurrency(summary.totalOverdue),
                                    bgColor: "red",
                                    color: "white",
                                },
                                {
                                    label: "Recovery",
                                    value: formatCurrency(summary.totalPayment),
                                    bgColor: "green",
                                    color: "white",
                                },
                                {
                                    label: "FIT",
                                    value: formatCurrency(summary.totalFit),
                                    bgColor: "#ff6f00ff",
                                    color: "white",
                                },
                                {
                                    label: "Local",
                                    value: formatCurrency(summary.totalOther),
                                    bgColor: "#c8ff00bc",
                                    color: "black",
                                },
                                {
                                    label: "Sales",
                                    value: formatCurrency(summary.totalFit + summary.totalOther),
                                    bgColor: "#1976d2",
                                    color: "white",
                                },
                            ].map((metric) => (
                                <Box
                                    key={metric.label}
                                    sx={{ backgroundColor: metric.bgColor, color: metric.color }}
                                >
                                    <Typography variant="h6" fontWeight="bold">
                                        {metric.label}
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {metric.value}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Collapse>
            </Box>
        );
    }
);

// ✅ Left card (yellow block)
const TraderInfoCard = ({ trader }) => (
    <CardContent
        sx={{
            bgcolor: "rgba(255, 247, 12, 0.84)",
            gridColumn: "span 2",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
        }}
    >
        <Typography variant="h6" fontWeight="bold">
            Location: {trader.address?.split(",")[0] || "--"}
        </Typography>
        <Typography variant="h6" fontWeight={700}>
            Payment: {formatCurrency(trader.payment) || 0}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
            FIT: {formatCurrency(trader.FitOrderAmount) || "--"}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
            Local: {formatCurrency(trader.OtherOrderAmount) || "--"}
        </Typography>
        <Typography variant="h6" fontWeight="bold">
            Promise: {trader.remarks || "--"}
        </Typography>
    </CardContent>
);

// ✅ Right card (fields block)
const TraderDetailsCard = ({ trader, fields, doneEntries = [] }) => {

    const renderField = (key, trader, value) => {
        if (value === undefined || value === null) return null;
        if (["Sale Date", "Recovery Date", "Credit Limit", "Balance", "number", 'doc'].includes(key)) return null;
        if (key === "Turnover Days" && value < 7) return null;

        let formattedDate = "";
        let rawDate = null;
        let extraInfo = "";

        if (key === "Sale" && trader["Sale Date"]) {
            rawDate = trader["Sale Date"];
            formattedDate = formatDate(rawDate);
        } else if (key === "lrecovery" && trader["Recovery Date"]) {
            rawDate = trader["Recovery Date"];
            formattedDate = formatDate(rawDate);
        } else if (key === "Credit Days" && trader["Credit Limit"]) {
            extraInfo = formatCurrency(trader["Credit Limit"]);
        } else if (key === "Overdue" && trader["Balance"]) {
            extraInfo = formatCurrency(trader["Balance"]);
        } else if (key === "ACID" && trader["number"]) {
            extraInfo = trader[key];
        } else if (key === "UrduName" && trader["doc"]) {
            extraInfo = trader["doc"];
        }

        let displayValue = typeof value === "number" ? formatCurrency(value) : value;
        if (key === "date") {
            displayValue = formatDate(value);
        }
        const label = key.includes("lrecovery")
            ? "L.Recovery"
            : key.includes("ale")
                ? "L.Sale"
                : key;

        const isUrdu = key === "UrduName";
        const isNug = key === "shopper";
        const isOverdue = key === "Overdue";
        const isDateOld = rawDate && isOlderThanOneMonth(rawDate);
        const flag = doneEntries?.includes(trader.ACID)
        return (
            <Typography
                key={key}
                variant={isUrdu ? "h3" : "h6"}
                dir={isUrdu || isNug ? "rtl" : "ltr"}
                sx={{
                    mb: 1,
                    gap: 2,
                    backgroundColor: isNug ? "#d7d7d7ff" : flag ? 'green' : "transparent",
                    width: isNug ? "fit-content" : "100%",
                    p: isNug ? '0 20px ' : 0,
                    rendering: isNug ? "optimizeLegibility" : "auto",
                    borderRadius: isNug ? 2 : 0,
                    textAlign: "right", // ✅ Always right-aligned for both
                    alignItems: "center",
                    justifyContent: "flex-end",
                    fontWeight: isUrdu ? "bold" : "normal",
                    color: isOverdue || isDateOld ? "red" : flag ? 'white' : "text.secondary",
                    fontFamily: isUrdu ? "Jameel Noori Nastaleeq, serif" : "poppins, sans-serif",
                }}
            >
                {/* main INFO */}
                <span
                    style={{
                        display: "inline-flex",
                        gap: "16px",
                        flexDirection: isUrdu ? "row-reverse" : "row",
                        alignItems: "center",
                    }}
                >
                    {!(isUrdu || isNug) && <strong>{`${makeStringPrettier(label)}:`}</strong>}
                    {isNug && <strong style={{
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        fontSize: "2.5rem",

                    }}>{`نگ:`}</strong>}
                    <span style={{
                        fontSize: isNug ? "2rem" : '',
                        fontFamily: isNug ? "poppins, sans-serif" : '',
                    }} >{displayValue} </span>
                </span>

                {/* secondary info */}
                {(formattedDate || extraInfo) && (
                    <>
                        <span style={{ margin: 1 }}>|</span>

                        <span
                            style={{
                                color: isOverdue ? "green" : isDateOld ? "red" : "",
                                fontSize: isUrdu || isNug ? "2rem" : "1rem",
                                marginInlineStart: isUrdu ? "0" : "8px",
                                marginInlineEnd: isUrdu ? "8px" : "0",
                                fontFamily: 'poppins, sans-serif',
                            }}
                        >
                            {` ${formattedDate || extraInfo}`}
                        </span>
                    </>
                )}
            </Typography>


        );
    };

    return (
        <CardContent sx={{ gridColumn: "span 3" }}>
            {fields?.map((key) => {
                const cleanedKey = key || cleanString(key)
                return (
                    renderField(cleanedKey, trader, trader[cleanedKey])
                )
            })}
        </CardContent>
    );
};

// ✅ Parent wrapper
export const TraderCard = React.memo(({ trader, fields, onClick, flag = false, doneEntries = [], sx = {} }) => {
    const entry = doneEntries?.includes(trader.ACID)

    return (
        <Card Card
            onClick={onClick}
            sx={{
                boxShadow: 3,
                display: "grid",
                color: entry ? 'white!important' : '',
                backgroundColor: entry ? 'green' : '',
                gridTemplateColumns: flag ? "repeat(5, 1fr)" : "repeat(3, 1fr)",
                cursor: "pointer",
                "&:hover": {
                    boxShadow: 6,
                    transform: "scale(1.02)",
                    transition: "transform 0.2s",
                },
                ...sx
            }}
        >

            {flag && (
                <TraderInfoCard trader={trader} />
            )}
            <TraderDetailsCard trader={trader} fields={fields} doneEntries={doneEntries} />
        </Card >
    )
});

const TurnoverReport = () => {
    // --- DIALOG STATE ---
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTrader, setSelectedTrader] = useState(null);

    const { pastRemarks } = useFetchRemarks(dialogOpen, selectedTrader?.ACID);
    // --- USER & ROLES ---
    const user = useMemo(
        () => JSON.parse(localStorage.getItem("user") || "{}"),
        []
    );
    const userRoles = useMemo(
        () => ({
            isZain: user?.username?.toLowerCase().includes("zain"),
            isAdmin: user?.userType?.toLowerCase().includes("admin"),
            isClassic: user?.userType?.toLowerCase().includes("clas"),
        }),
        [user]
    );

    // FIX: Correctly define the function signature to match the arguments passed from onRender.
    // This ensures `handleNavigate` and `handleSubmit` are assigned to the correct variables.
    const remarkDialogUi = (
        images, customer, remark, setRemark, pastRemarks, error, acid, handleNavigate, handleSubmit, onClose) => {
        return (
            <RemarkDialogUI
                open={dialogOpen} // Use state from the parent component scope
                onClose={onClose}
                acid={acid}
                name={customer?.Subsidary || customer?.UrduName} // Use the passed `customer` object
                pastRemarks={pastRemarks}
                remark={remark}
                setRemark={setRemark}
                error={error}
                handleNavigate={handleNavigate}
                handleSubmit={handleSubmit}
            />
        )
    }
    // --- DATA & FILTERING STATE ---
    const [turnoverData, setTurnoverData] = useLocalStorageState("turnoverData", {
        defaultValue: [],
    });
    const [isLoading, setIsLoading] = useState(false);
    const [params, setParams] = useState({
        route: "",
        spo: userRoles.isAdmin || userRoles.isZain ? "" : user.username,
        date: new Date().toISOString().split("T")[0],
        nameFilter: "",
        statusFilter: "Pending",
    });

    const handleParamsChange = useCallback((key, value) => {
        setParams((prev) => ({ ...prev, [key]: value }));
    }, []);

    // --- DATA FETCHING ---
    const fetchReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(`${API_URL}/turnover`, {
                params: {
                    route: params.route,
                    spo: params.spo,
                    date: new Date(params.date),
                    company: userRoles.isClassic ? "classic" : "",
                },
            });
            if (!isEqual(turnoverData, res.data)) {
                setTurnoverData(res.data);
            }
        } catch (error) {
            console.error("Error fetching turnover data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [
        params.route,
        params.spo,
        params.date,
        userRoles.isClassic,
        turnoverData,
        setTurnoverData,
    ]);

    const handlePostRemark = useCallback(
        async (acid, remarks) => {
            await axios.post(`${API_URL}/turnover/post`, {
                datetime: new Date(),
                acid,
                remarks,
                spo: user.username,
            });
            fetchReport(); // Re-fetch data to reflect changes
        },
        [user.username, fetchReport]
    );

    useEffect(() => {
        if (!dialogOpen) {
            fetchReport();
        }
    }, [dialogOpen]); // Refetch when dialog closes

    // --- MEMOIZED DATA PROCESSING ---
    const { filteredData, summary } = useMemo(() => {
        const data = turnoverData || [];
        // Categorize data
        const categorized = {
            Done: data.filter(
                (i) =>
                    i.payment ||
                    i.remarks ||
                    i.orderAmount ||
                    i.FitOrderAmount ||
                    i.OtherOrderAmount
            ),
            Pending: data.filter(
                (i) =>
                    !(
                        i.payment ||
                        i.remarks ||
                        i.orderAmount ||
                        i.FitOrderAmount ||
                        i.OtherOrderAmount
                    )
            ),
            Payments: data.filter((i) => i.payment),
            Orders: data.filter((i) => i.orderAmount),
            Remarks: data.filter((i) => i.remarks),
            All: data,
        };

        let currentData = categorized[params.statusFilter] || categorized.Pending;

        // Apply name filter if present
        if (params.nameFilter) {
            currentData = data.filter((item) =>
                item.Subsidary?.toLowerCase().includes(params.nameFilter.toLowerCase())
            );
        }

        // Calculate summaries on the full dataset
        const summary = {
            allData: data,
            totalCount: data.length,
            actions: categorized.Done.length,
            totalOverdue: data.reduce(
                (sum, item) => sum + (parseFloat(item.Overdue) || 0),
                0
            ),
            totalPayment: data.reduce(
                (sum, item) => sum + (parseFloat(item.payment) || 0),
                0
            ),
            totalFit: data.reduce(
                (sum, item) => sum + (parseFloat(item.FitOrderAmount) || 0),
                0
            ),
            totalOther: data.reduce(
                (sum, item) => sum + (parseFloat(item.OtherOrderAmount) || 0),
                0
            ),
        };

        return { filteredData: currentData, summary };
    }, [turnoverData, params.statusFilter, params.nameFilter]);

    // --- DIALOG HANDLERS ---
    const openDialog = useCallback((trader) => {
        setSelectedTrader(trader);
        setDialogOpen(true);
    }, []);

    const closeDialog = useCallback(() => {
        setDialogOpen(false);
        setSelectedTrader(null);
    }, []);

    // --- RENDER ---
    return (
        <Container sx={{ p: 0 }}>
            <SummaryBar
                summary={summary}
                userRoles={userRoles}
                onParamsChange={handleParamsChange}
                onFetch={fetchReport}
                isLoading={isLoading}
                spoUser={user}
            />
            <Box sx={{ display: "grid", gap: 3, mb: "10rem" }}>
                {filteredData.map((trader) => (
                    <TraderCard
                        key={trader.ACID}
                        trader={trader}
                        fields={FIELDS_TO_DISPLAY}
                        flag={true}
                        onClick={() => openDialog(trader)}
                    />
                ))}
            </Box>
            {selectedTrader && (
                <RemarkDialog
                    open={dialogOpen}
                    onRender={remarkDialogUi}
                    onClose={closeDialog}
                    acid={selectedTrader.ACID}
                    name={selectedTrader.Subsidary || selectedTrader.UrduName}
                    onSubmitRemark={handlePostRemark}
                    pastRemarks={pastRemarks}
                    customer={selectedTrader} // FIX: Pass the selectedTrader object as the customer prop.
                />
            )}
        </Container>
    );
};

export default TurnoverReport;