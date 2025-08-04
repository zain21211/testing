import React, { useState, useEffect, useCallback } from 'react';
import useLocalStorage from 'use-local-storage-state';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DataTable from './table';
import {
    Card,
    CardContent,
    Typography,
    Container,
    Box,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from '@mui/material';

const user = JSON.parse(localStorage.getItem("user"));
const userType = user?.userType?.toLowerCase()
const username = user?.username?.toLowerCase()

const isZain = username.includes('zain')
const isAdmin = userType.includes('admin')

const columns = [
    { id: "remarks", label: 'remarks' },
    {
        label: 'date',
        id: "datetime",
        render: (value) => {
            if (!value) return "N/A";
            const date = new Date(value);
            const day = String(date.getDate());
            const month = String(date.getMonth() + 1)
                ;
            const year = String(date.getFullYear()).slice(-2); // only last 2 digits
            return `${day}/${month}/${year}`;
        },
    }
]

const url = import.meta.env.VITE_API_URL
// columns to display:
const fieldsToDisplay = ["ACID", "Overdue", "Balance", "UrduName", "Sale", "Sale Date", "lrecovery", "Recovery Date", "Credit Days", 'Credit Limit', "Recovery", "Turnover Days"]; // Customize this list
const special = ["Sale", "Sale Date", "lrecovery", "Recovery Date", "Overdue", "Balance", 'Credit Days', 'Credit Limit'];

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0.00";
    // Format to 0 decimal places for currency string, but keep as number for calculations
    // Use toLocaleString for thousands separators
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const DialogBox = ({
    open,
    onClose,
    // on,
    acid,
    name = "",
    onSubmitRemark,
    onView,
    // data
}) => {
    const [remark, setRemark] = useState('');
    const [error, setError] = useState(null)
    const [data, setData] = useState([])
    const navigate = useNavigate()

    const fetchRemarks = async () => {
        if (!acid) return;
        // setLoading(true);
        try {
            const res = await axios.get(`${url}/turnover/remarks`, {
                params: { acid }
            });
            setData(res.data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch remarks");
        } finally {
            // setLoading(false);.
        }
    };

    // Automatically fetch when dialog opens
    useEffect(() => {
        if (open && acid) {
            fetchRemarks();
        }
    }, [open, acid]);

    const onClick = useCallback((on) => {
        if (!acid) {
            // Maybe show an alert or error message
            setError("Please select a customer and a date to view the ledger.");
            return;
        }

        const endDateObj = new Date();
        const startDateObj = new Date();
        startDateObj.setMonth(startDateObj.getMonth() - 3);

        // Format dates as YYYY-MM-DD for the URL params
        const ledgerStartDate = startDateObj.toISOString().split("T")[0];
        const ledgerEndDate = endDateObj.toISOString().split("T")[0];

        // Construct the URL for the ledger page
        const url = `/${on}?name=${encodeURIComponent(
            name || ""
        )}&acid=${encodeURIComponent(
            acid
        )}&startDate=${encodeURIComponent(
            ledgerStartDate
        )}&endDate=${encodeURIComponent(ledgerEndDate)}`;

        // Use navigate or window.open depending on desired behavior
        // window.open(url, "_blank"); // Open in new tabR
        navigate(url, {
            state: {
                orderForm: true
            }
        });
    }, [acid, navigate]); // Added navigate dependency

    const handleSubmit = () => {
        onSubmitRemark(acid, remark);
        setRemark('');
        onClose(); // optionally close dialog after submit
    };

    const onOrder = () => {
        onClick("order")
    }
    const onRecovery = () => {
        onClick("recovery")

    }
    const onLedger = () => {
        onClick("ledger")
    }
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="md"
            PaperProps={{
                sx: {
                    height: '50vh', // or any desired height
                    borderRadius: '1rem',
                    p: "1rem"

                },
            }}>
            <DialogTitle>
                <Typography variant='h4' fontWeight={"bold"}>CUSTOMER ID: {acid}</Typography>
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Enter Remark"
                    fullWidth
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    margin="normal"
                />
                {/* <Button variant="contained" onClick={() => fetchRemarks()} color="primary" mb>
                    View Promises
                </Button> */}
                <DataTable
                    data={data}
                    columns={columns}
                />
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={() => onOrder(acid)} color="primary">
                    Order
                </Button>

                <Button variant="contained" onClick={() => onRecovery(acid)} color="secondary">
                    recovery
                </Button>
                <Button variant="contained" onClick={() => onLedger(acid)} color="warning">
                    ledger
                </Button>
                <Button
                    onClick={handleSubmit}
                    color="success"
                    variant="contained"
                // size='medium'
                // fullWidth
                >
                    Submit Remark
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export const TurnoverReport = () => {
    const [open, setOpen] = useState(false);
    const [selectedAcid, setSelectedAcid] = useState(null);
    const [turnoverData, setTurnoverData] = useLocalStorage('turnoverData', []);
    const [spo, setSpo] = useLocalStorage('spo', [])
    const [route, setRoute] = useLocalStorage('route', [])
    const [list, setList] = useState([])

    const fetchReport = async () => {
        try {
            const res = await axios.get(`${url}/turnover`, {
                params: {
                    route,
                    spo: spo ?? username,

                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            // const { payment, orderAmount } = res.data;

            console.log('Turnover data:', res.data);
            setTurnoverData(res.data);

        } catch (error) {
            console.error('Error fetching turnover data:', error);
        }
    };

    const openDialog = (acid) => {
        setSelectedAcid(acid);
        setOpen(true);
    };

    const closeDialog = () => {
        setOpen(false);
        setSelectedAcid(null);
    };

    const handlePost = async (acid, remarks) => {
        const datetime = new Date();
        const payload = {
            datetime,
            acid,
            spo: username,
            remarks
        };

        console.table(payload)
        const res = await axios.post(`${url}/turnover/post`, payload)
        alert(res.data)
    }



    return (
        <Container sx={
            { p: 0 }
        }>
            <Box sx={{}}>
                <Typography variant="h4" component="h1" textAlign={'center'} textTransform={'uppercase'} fontWeight={"bold"} marginY={5} gutterBottom>
                    Turnover Report
                </Typography>
                <Box
                    sx={{
                        position: 'sticky',
                        backgroundColor: "white",
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 3,
                        // maxWidth: "60%",
                        // margin: 'auto',
                        padding: 2,
                        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                        top: 70,


                    }}
                    mb={3}
                >
                    <TextField
                        label=
                        'Route'
                        value={route}
                        onChange={e => setRoute(e.target.value)}
                        onFocus={e => e.target.select()}
                    />

                    {/* for spo */}
                    {(isZain || isAdmin) && (
                        <TextField
                            label=
                            'SPO'
                            value={spo}
                            onFocus={e => e.target.select()}
                            onChange={e => setSpo(e.target.value)}
                        />
                    )}
                    <Button variant='contained' onClick={fetchReport}>
                        GET
                    </Button>
                </Box>
                <Box
                    sx={{
                        display: "grid",
                        gap: 3,
                        marginBottom: '10rem',
                    }}
                    MB={10}
                >
                    {turnoverData?.map((trader) => (
                        <Card
                            key={trader.ACID}
                            sx={{
                                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                                fontSize: "2rem",
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                cursor: 'pointer',
                            }}
                            onClick={() => openDialog(trader.ACID)}
                        >
                            <CardContent
                                sx={{
                                    backgroundColor: "rgba(255, 247, 12, 0.84)",
                                    boxShadow: '0px 10px 18px rgba(0, 0, 0, 0.43)',
                                    gridColumn: 'span 2',
                                    display: 'flex',               // Enable flexbox
                                    flexDirection: 'column',      // Stack typography vertically
                                    // alignItems: 'center',         // Center horizontally
                                    justifyContent: 'center',     // Center vertically
                                    // textAlign: 'center',          // Center text inside Typography
                                }}
                            >
                                <Typography variant="h6" fontWeight="bold">
                                    Payment: {formatCurrency(trader.payment) || "--"}
                                </Typography>
                                <Typography variant="h6" fontWeight="bold">
                                    Order: {formatCurrency(trader.orderAmount) || "--"}
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    Promise: {trader.remarks || "--"}
                                </Typography>
                            </CardContent>

                            <CardContent sx={{ gridColumn: 'span 3' }}>
                                {fieldsToDisplay?.map((key) => {
                                    const value = trader[key];
                                    if (value === undefined || value === null) return null;

                                    const isSpecial = special.includes(key);

                                    if (["Sale Date", "Recovery Date", 'Credit Limit', 'Balance'].includes(key)) return null;
                                    if (key === "Turnover Days" && value < 7) return null;

                                    if (isSpecial) {
                                        let formattedDate = "";

                                        if (key === "Sale" && trader["Sale Date"]) {
                                            formattedDate = trader["Sale Date"].split("T")[0];
                                        } else if (key === "lrecovery" && trader["Recovery Date"]) {
                                            formattedDate = trader["Recovery Date"].split("T")[0];
                                        } else if (key === "Credit Days" && trader["Credit Limit"]) {
                                            formattedDate = Math.round(trader["Credit Limit"]).toLocaleString()
                                        } else if (key === "Overdue" && trader["Balance"]) {
                                            formattedDate = Math.round(trader["Balance"]).toLocaleString();
                                        }

                                        // Format value safely
                                        const displayValue =
                                            typeof value === "number" ? Math.round(value).toLocaleString() : value;

                                        return (
                                            <Typography
                                                key={key}
                                                variant="h6"
                                                sx={{
                                                    textAlign: "right",
                                                    mb: 1,
                                                    color:
                                                        key === "UrduName"
                                                            ? "black"
                                                            : key === "TurnOver"
                                                                ? "green"
                                                                : key === "Overdue"
                                                                    ? "red"
                                                                    : "text.secondary",
                                                }}
                                            >
                                                <strong>{`${key}:`}</strong>{" "}
                                                {displayValue}
                                                <span style={{ color: key === "Overdue" ? "green" : "" }}>
                                                    {formattedDate && ` | ${formattedDate}`}
                                                </span>
                                            </Typography>
                                        );
                                    }


                                    return (
                                        <Typography
                                            key={key}
                                            variant={key === "UrduName" ? "h3" : key === "totalTurnover" ? "h4" : "h6"}
                                            sx={{
                                                dir: "rtl",
                                                textAlign: "right",
                                                letterSpacing: "normal",
                                                fontFamily: key === "UrduName" ? "Jameel Noori Nastaleeq, serif" : "",
                                                color:
                                                    key === "UrduName"
                                                        ? "black"
                                                        : key === "TurnOver"
                                                            ? "green"
                                                            : key === "Overdue"
                                                                ? "red"
                                                                : "text.secondary",
                                                fontWeight: key === "UrduName" ? "bold" : "normal",
                                                mb: 1,
                                            }}
                                        >
                                            <strong>
                                                {key === "UrduName"
                                                    ? ""
                                                    : key === "Recovery"
                                                        ? "Recovery(30 days): "
                                                        : `${key}:`}
                                            </strong>{" "}
                                            {typeof value === "number" && key !== "ACID"
                                                ? Math.round(value).toLocaleString()
                                                : value?.toString().split("T")[0] || value}
                                        </Typography>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    ))}

                    <DialogBox
                        open={open}
                        onClose={closeDialog}
                        acid={selectedAcid}
                        // onView={fetchRemarks}
                        data={list}
                        onAction1={(acid) => console.log("Action 1", acid)}
                        onAction2={(acid) => console.log("Action 2", acid)}
                        onAction3={(acid) => console.log("Action 3", acid)}
                        onSubmitRemark={(acid, remark) => {
                            console.log("Submitted remark:", remark, "for", acid)
                            handlePost(acid, remark)
                        }}
                    // onSubmitRemark={handlePost}
                    />
                </Box>
            </Box>
        </Container>
    );
};

// export default TurnoverReport;