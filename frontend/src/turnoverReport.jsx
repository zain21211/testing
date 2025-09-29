import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import isEqual from "lodash/isEqual";

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

// export const RemarkDialog = React.memo(
//     ({ open, onClose, acid, name, onSubmitRemark, pastRemarks }) => {
//         const [remark, setRemark] = useState("");
//         // const [pastRemarks, setPastRemarks] = useState([]);
//         const [error, setError] = useState(null);

//         const navigate = useNavigate();

//         // useEffect(() => {
//         //     // const fetchRemarks = async () => {
//         //     //     if (open && acid) {
//         //     //         try {
//         //     //             const res = await axios.get(`${API_URL}/turnover/remarks`, {
//         //     //                 params: { acid },
//         //     //             });
//         //     //             setPastRemarks(res.data || []);
//         //     //         } catch (err) {
//         //     //             console.error("Failed to fetch remarks:", err);
//         //     //             setError("Failed to fetch past remarks.");
//         //     //         }
//         //     //     }
//         //     // };
//         //     onFetch(open, acid, setPastRemarks);
//         // }, [open, acid]);

//         const handleNavigate = useCallback(
//             (page) => {
//                 if (!acid) return;
//                 const startDate = new Date();
//                 startDate.setMonth(startDate.getMonth() - 3);
//                 const url = `/${page}?name=${encodeURIComponent(
//                     name || ""
//                 )}&acid=${encodeURIComponent(acid)}&startDate=${startDate.toISOString().split("T")[0]
//                     }&endDate=${new Date().toISOString().split("T")[0]}`;
//                 navigate(url);
//             },
//             [acid, name, navigate]
//         );

//         const handleSubmit = () => {
//             if (!remark.trim()) return;
//             onSubmitRemark(acid, remark);
//             setRemark("");
//             onClose();
//         };

//         return (
//             <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
//                 <DialogTitle>Customer Actions: {acid}</DialogTitle>
//                 <DialogContent>
//                     <TextField
//                         label="Enter New Remark"
//                         fullWidth
//                         value={remark}
//                         onChange={(e) => setRemark(e.target.value)}
//                         margin="normal"
//                     />
//                     {error && <Typography color="error">{error}</Typography>}
//                     {pastRemarks?.length > 0 && (
//                         <DataTable data={pastRemarks} columns={REMARK_COLUMNS} />
//                     )}
//                 </DialogContent>
//                 <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
//                     <Box>
//                         <Button
//                             variant="contained"
//                             onClick={() => handleNavigate("order")}
//                             color="primary"
//                             sx={{ mr: 1 }}
//                         >
//                             Order
//                         </Button>
//                         <Button
//                             variant="contained"
//                             onClick={() => handleNavigate("recovery")}
//                             color="secondary"
//                             sx={{ mr: 1 }}
//                         >
//                             Recovery
//                         </Button>
//                         <Button
//                             variant="contained"
//                             onClick={() => handleNavigate("ledger")}
//                             color="warning"
//                         >
//                             Ledger
//                         </Button>
//                     </Box>
//                     <Button onClick={handleSubmit} color="success" variant="contained">
//                         Submit Remark
//                     </Button>
//                 </DialogActions>
//             </Dialog>
//         );
//     }
// );
// useRemarkDialog.ts

export function useRemarkDialog({ open, acid, name, onSubmitRemark, onClose }) {
    const [remark, setRemark] = useState("");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleNavigate = useCallback(
        (page) => {
            if (!acid) return;
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 3);
            const url = `/${page}?name=${encodeURIComponent(name || "")}&acid=${encodeURIComponent(
                acid
            )}&startDate=${startDate.toISOString().split("T")[0]}&endDate=${new Date()
                .toISOString()
                .split("T")[0]}`;
            navigate(url);
        },
        [acid, name, navigate]
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
// import React from "react";
// import {
//     Dialog,
//     DialogTitle,
//     DialogContent,
//     DialogActions,
//     Button,
//     TextField,
//     Typography,
//     Box,
// } from "@mui/material";
// import DataTable from "./DataTable";
// import { REMARK_COLUMNS } from "./constants";

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
                {pastRemarks.length > 0 && (
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
// import { useRemarkDialog } from "./useRemarkDialog";
// import { RemarkDialogUI } from "./RemarkDialogUI";

export const RemarkDialog = React.memo(
    ({ open, onClose, acid, name, onSubmitRemark, pastRemarks, onRender, customer }) => {
        const { remark, setRemark, error, handleNavigate, handleSubmit } =
            useRemarkDialog({ open, acid, name, onSubmitRemark, onClose });

        if (!onRender) {
            alert("nothing to  render")
            return;
        }
        return (
            onRender(customer, remark, setRemark, pastRemarks, error, acid, handleNavigate, onSubmitRemark, onClose, pastRemarks)
        );
    }
);


const SummaryBar = React.memo(
    ({ summary, userRoles, onParamsChange, onFetch, isLoading }) => {
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
const TraderDetailsCard = ({ trader, fields }) => {
    const renderField = (key, trader, value) => {
        if (value === undefined || value === null) return null;
        if (["Sale Date", "Recovery Date", "Credit Limit", "Balance", "number"].includes(key)) return null;
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
            extraInfo = trader["number"];
        }

        const displayValue = typeof value === "number" ? formatCurrency(value) : value;
        const label = key.includes("lrecovery")
            ? "L.Recovery"
            : key.includes("ale")
                ? "L.Sale"
                : key;

        const isUrdu = key === "UrduName";
        const isOverdue = key === "Overdue";
        const isDateOld = rawDate && isOlderThanOneMonth(rawDate);

        return (
            <Typography
                key={key}
                variant={isUrdu ? "h3" : "h6"}
                sx={{
                    dir: isUrdu ? "rtl" : "ltr",
                    textAlign: "right",
                    mb: 1,
                    fontFamily: isUrdu ? "Jameel Noori Nastaleeq, serif" : "",
                    fontWeight: isUrdu ? "bold" : "normal",
                    color: isOverdue || isDateOld ? "red" : "text.secondary",
                }}
            >
                <strong>{isUrdu ? "" : `${label}: `}</strong>
                {displayValue}
                {(formattedDate || extraInfo) && (
                    <span style={{ color: isOverdue ? "green" : isDateOld ? "red" : "" }}>
                        {` | ${formattedDate || extraInfo}`}
                    </span>
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
export const TraderCard = React.memo(({ trader, fields, onClick, flag = false }) => (
    <Card
        onClick={onClick}
        sx={{
            boxShadow: 3,
            display: "grid",
            gridTemplateColumns: flag ? "repeat(5, 1fr)" : "repeat(3, 1fr)",
            cursor: "pointer",
            "&:hover": {
                boxShadow: 6,
                transform: "scale(1.02)",
                transition: "transform 0.2s",
            },
        }}
    >

        {flag && (
            <TraderInfoCard trader={trader} />
        )}
        <TraderDetailsCard trader={trader} fields={fields} />
    </Card>
));

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
    const remarkDialogUi = (remark, setRemark, pastRemarks, error, acid, handleNavigate, handleSubmit, onClose) => {
        return (
            <Box>
                <RemarkDialogUI
                    open={open}
                    onClose={onClose}
                    acid={acid}
                    name={name}
                    pastRemarks={pastRemarks}
                    remark={remark}
                    setRemark={setRemark}
                    error={error}
                    handleNavigate={handleNavigate}
                    handleSubmit={handleSubmit}
                />
            </Box>
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
                />
            )}
        </Container>
    );
};

export default TurnoverReport;
