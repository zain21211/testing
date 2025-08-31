import axios from 'axios';
import DataTable from './table';
import useLocalStorage from 'use-local-storage-state';
import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
    Autocomplete,
    FormControl,
    InputLabel,
    MenuItem,
    Select
} from '@mui/material';
import { Box, IconButton, Collapse } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import {
    Card,
    CardContent,
    Typography,
    Container,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from '@mui/material';
import isEqual from "lodash/isEqual";
import { set } from 'lodash';
// import { use } from 'react';
// import { set } from 'date-fns';

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

// date formatting d/m/yy
function formatDate(value) {
    const date = new Date(value); // convert input to Date
    const day = String(date.getDate()) // get day and pad with 0 if needed
    const month = String(date.getMonth() + 1) // get month (0-based) +1 and pad
    const year = String(date.getFullYear()).slice(-2);

    return `${day}-${month}-${year}`;
}

const isOneMonth = (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;

    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    return date < oneMonthAgo;
};

// columns to display:
const fieldsToDisplay = ["ACID", "number", "Overdue", "Balance", "UrduName", "Sale", "Sale Date", "lrecovery", "Recovery Date", "Credit Days", 'Credit Limit', "Recovery", "Turnover Days"]; // Customize this list
const special = ["Sale", "Sale Date", "lrecovery", "Recovery Date", "Overdue", "Balance", 'Credit Days', 'Credit Limit', "ACID", "number"];

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

const StatusFilter = ({ handleChange }) => {
    const [filter, setFilter] = useState('pending');
    const FilterValues = [
        'Pending',
        "Done",
        'Payments',
        'Orders',
        'Remaks',
        'All'
    ]
    useEffect(() => {
        handleChange(filter);
    }, [filter, handleChange]);

    return (
        <FormControl sx={{}}>
            <InputLabel id="status-filter-label">Status</InputLabel>
            <Select
                labelId="status-filter-label"
                id="status-filter"
                value={filter}
                label="Status"
                onChange={(e) => setFilter(e.target.value)}
            >
                {FilterValues.map(value => (
                    <MenuItem value={value}>{value}</MenuItem>
                ))}

            </Select>
        </FormControl>
    );
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

    // onclick functions
    const onOrder = () => { onClick("order") }
    const onRecovery = () => { onClick("recovery") }
    const onLedger = () => { onClick("ledger") }

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
                {/* remarks  */}
                <TextField
                    label="Enter Remark"
                    fullWidth
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    margin="normal"
                />
                <DialogActions>
                    {/* submit */}
                    <Button
                        onClick={handleSubmit}
                        color="success"
                        variant="contained"
                        sx={{
                            fontSize: '1.2rem',
                        }}
                    >
                        Submit
                    </Button>
                </DialogActions>

                {/* table */}
                {data.length > 0 && (
                    <DataTable
                        data={data}
                        columns={columns}
                    />
                )}
            </DialogContent>
            <DialogActions
            >
                <Button variant="contained" sx={{
                    fontSize: '1.1rem',
                }}
                    onClick={() => onOrder(acid)}
                    color="primary"
                >
                    Order
                </Button>

                <Button variant="contained" sx={{
                    fontSize: '1.1rem',
                }}
                    onClick={() => onRecovery(acid)}
                    color="secondary"
                >
                    recovery
                </Button>
                <Button variant="contained"
                    onClick={() => onLedger(acid)}
                    color="warning"
                    sx={{
                        fontSize: '1.1rem',
                    }}
                >
                    ledger
                </Button>


            </DialogActions>
        </Dialog>
    );
};


// const formatDate = (dateStr) => {
//   const date = new Date(dateStr);
//   const dd = String(date.getDate()).padStart(2, "0");
//   const mm = String(date.getMonth() + 1).padStart(2, "0");
//   const yyyy = date.getFullYear();
//   return dd + mm + yyyy;
// };


function DateInput({ handleDate }) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // default to today
    // DDMMYYYY
    const [pickerValue, setPickerValue] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

    useEffect(() => {
        if (handleDate) handleDate(pickerValue);
    }, [pickerValue, handleDate]);

    const handleChange = (e) => {
        const raw = e.target.value; // YYYY-MM-DD from picker
        if (!raw) {
            setDate("");
            setPickerValue("");
            return;
        }
        const [yyyy, mm, dd] = raw.split("-");
        setDate(dd + '-' + mm + '-' + yyyy);  // store as DDMMYYYY
        setPickerValue(raw);       // keep picker happy
    };

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
}



const TurnoverReport = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userType = user?.userType?.toLowerCase()
    const username = user?.username?.toLowerCase()

    const isZain = username?.includes('zain')
    const isAdmin = userType?.includes('admin')
    const isClassic = userType?.includes('clas')

    const [open, setOpen] = useState(false);
    const [selectedAcid, setSelectedAcid] = useState(null);
    const [turnoverData, setTurnoverData] = useLocalStorage('turnoverData', []);
    const [spo, setSpo] = useLocalStorage('spo', [])
    const [route, setRoute] = useLocalStorage('route', [])
    const [list, setList] = useState([])
    const [totalOverdue, setTotalOverdue] = useState(null)
    const [totalPayment, setTotalPayment] = useState(null)
    const [Actions, setActions] = useState(null)
    const [totalSale, setTotalSale] = useState(0)
    const location = useLocation()
    const [pending, setPending] = useState([])
    const [done, setDone] = useState([])
    const [payments, setPayments] = useState([])
    const [orders, setOrders] = useState([])
    const [remarks, setRemarks] = useState([])
    const [all, setAll] = useState([])
    const [total, setTotal] = useState([]); // for all trader data
    const [filter, setFilter] = useState('pending');
    const [totalFit, setTotalFit] = useState(0);
    const [totalOther, setTotalOther] = useState(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // default to today
    const [isLoading, setIsLoading] = useState(false); // New loading state
    const [nameFilter, setNameFilter] = useState(''); // New name filter state
    const [showBox, setShowBox] = useState(true);

    const onChange = (value) => {
        if (nameFilter) return; // Don't filter if nameFilter is set
        setFilter(value);
        // alert(`Showing ${value} customers. spo ${userType}`);
        if (value === 'all') {
            setTotal(all);
        } else if (value === 'done') {
            setTotal(done);
        } else if (value === 'orders') {
            setTotal(orders);
        } else if (value === 'payment') {
            setTotal(payments);
        } else if (value === 'remarks') {
            setTotal(remarks);
        } else {
            setTotal(pending);
        }
    };

    const handleDate = (date) => {
        setDate(date);

    }

    useEffect(() => {
        if (turnoverData) {
            const data = turnoverData;
            const done = data.filter(item => item.payment || item.remarks || item.orderAmount || item.FitOrderAmount || item.OtherOrderAmount);
            const pending = data.filter(item => !(item.payment || item.remarks || item.orderAmount))
            const overdue = data.reduce((sum, item) => sum + (parseFloat(item.Overdue) || 0), 0);
            const payment = data.reduce((sum, item) => sum + (parseFloat(item.payment) || 0), 0);
            const recovery = data.filter((item) => item.payment);
            const remarks = data.filter((item) => item.remarks);
            const orders = data.filter((item) => item.orderAmount);
            const fit = data.reduce((sum, item) => sum + (parseFloat(item.FitOrderAmount) || 0), 0);
            const other = total.reduce((sum, item) => sum + (parseFloat(item.OtherOrderAmount) || 0), 0);
            const action = done.length


            setAll(data)
            setDone(done)
            setTotalFit(fit)
            setOrders(orders)
            setActions(action)
            setPending(pending)
            setRemarks(remarks)
            setTotalOther(other)
            setPayments(recovery)
            setTotalOverdue(overdue)
            setTotalPayment(payment)
        }

    }, [turnoverData, location, filter])

    useEffect(() => {
        if (turnoverData) {
            setTotal(turnoverData);
        }
    }, [turnoverData, location]);


    const fetchReport = async () => {
        setIsLoading(true); // Set loading to true

        try {
            const res = await axios.get(`${url}/turnover`, {
                params: {
                    route,
                    spo: (isAdmin || isZain) ? spo : username,
                    date: new Date(date),
                    company: isClassic ? "classic" : "",
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!isEqual(turnoverData, res.data)) {
                setTurnoverData(res.data);
                setTotal(res.data);
            }

        } catch (error) {
            console.error('Error fetching turnover data:', error);
        } finally {
            setIsLoading(false); // Set loading to false
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
        await axios.post(`${url}/turnover/post`, payload)
    }

    // useEffect(() => {
    //     // fetch once immediately when the user visits
    //     fetchReport();

    //     // start interval
    //     const intervalId = setInterval(fetchReport, 5 * 60 * 1000);

    //     // cleanup when user leaves the page/component
    //     return () => clearInterval(intervalId);
    // }, []); // empty deps => run only on mount/unmount

    useEffect(() => {
        if (!open) {
            fetchReport();
        }
    }, [open])

    return (
        <Container sx={
            { p: 0 }
        }>
            <Box sx={{}}>

                {/* summary bar */}
                <Box sx={{ position: 'sticky', top: 55, zIndex: 1000, background: 'transparent' }}>
                    {(isZain || isAdmin) && (
                        <Box display="flex" justifyContent="flex-end" mb={1} sx={{ position: 'sticky', top: 62, zIndex: 1000 }}>
                            <IconButton onClick={() => setShowBox((prev) => !prev)} sx={{
                                backgroundColor: 'white', padding: 1, borderRadius: '50%',
                            }}>
                                {showBox ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </Box>
                    )}
                    {/* Collapsible Box */}
                    <Collapse in={showBox}>
                        <Box
                            sx={{
                                borderRadius: '.5rem',
                                backgroundColor: "white",
                                display: 'grid',
                                gridTemplateColumns: (isZain || isAdmin) ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                                gap: 3,
                                padding: 2,
                                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                            }}
                            mb={3}
                        >
                            <Box
                                display="grid"
                                sx={{ gridColumn: (isZain || isAdmin) ? "span 4" : "span 3" }}
                                gridTemplateColumns={(isZain || isAdmin) ? "repeat(4, 1fr)" : "repeat(3, 1fr)"}
                                gap={2} // spacing between columns
                            >
                                {(isZain || isAdmin) && (
                                    <Box sx={{ gridColumn: "span 1" }}>
                                        <DateInput handleDate={handleDate} />
                                    </Box>
                                )}

                                <Box sx={{ gridColumn: (isZain || isAdmin) ? "span 3" : "span 3" }}>
                                    <Autocomplete
                                        freeSolo
                                        options={turnoverData}
                                        value={nameFilter}
                                        getOptionLabel={(option) => {
                                            if (typeof option === "string") return option;
                                            if (option && option.Subsidary) return option.Subsidary || option.name || "";
                                            return "";
                                        }}
                                        onInputChange={(event, value) => {
                                            if (value) {
                                                setNameFilter(value);
                                                const filteredData = turnoverData.filter((item) =>
                                                    item.Subsidary?.toLowerCase().includes(value.toLowerCase())
                                                );
                                                console.log("Filtered Data:", filteredData);
                                                setTotal(filteredData);
                                            } else {
                                                setTotal(turnoverData);
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                variant="outlined"
                                                fullWidth
                                                placeholder="Search by Name"
                                            />
                                        )}
                                    />
                                </Box>
                            </Box>

                            <TextField
                                label=
                                'Route'
                                value={route}
                                onChange={e => setRoute(e.target.value)}
                                sx={{
                                    "& input": {
                                        textTransform: 'uppercase',
                                    }
                                }}
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
                            <Button variant='contained' onClick={fetchReport} disabled={isLoading}>
                                {isLoading ? 'Loading...' : 'GET'}
                            </Button>
                            <StatusFilter handleChange={onChange} />


                            <Box
                                display="grid"
                                gridColumn={(isZain || isAdmin) ? 'span 4' : 'span 3'}
                                gridTemplateColumns={{
                                    xs: 'repeat(3, 1fr)',
                                    sm: 'repeat(3, 1fr)',
                                    md: 'repeat(6, 1fr)',
                                }}
                                border="2px solid black"
                                sx={{
                                    '& > div': {
                                        border: "2px solid black",
                                        textAlign: "center",
                                        p: 1,
                                    },
                                }}
                            >
                                {/* Customers - Neutral */}
                                <Box sx={{ backgroundColor: '#e0e0e0', color: 'black' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Customers
                                    </Typography>
                                    <Typography fontSize="1.5rem" color="green" fontWeight={"bold"}>
                                        {Actions} / <span style={{ color: 'black' }}>{turnoverData?.length}</span>
                                    </Typography>
                                </Box>

                                {/* Overdue - Deep Red */}
                                <Box sx={{ backgroundColor: 'red', color: 'white' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Overdue
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {formatCurrency(totalOverdue)}
                                    </Typography>
                                </Box>

                                {/* Recovery - Soft Green */}
                                <Box sx={{ backgroundColor: 'green', color: 'white' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Recovery
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {formatCurrency(totalPayment)}
                                    </Typography>
                                </Box>

                                {/* FIT - Amber */}
                                <Box sx={{ backgroundColor: '#ff6f00ff', color: 'white' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        FIT
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {formatCurrency(totalFit)}
                                    </Typography>
                                </Box>

                                {/* Local - Bright Teal */}
                                <Box sx={{ backgroundColor: '#c8ff00bc', color: 'black' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Local
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {formatCurrency(totalOther)}
                                    </Typography>
                                </Box>

                                {/* Sales - Royal Blue */}
                                <Box sx={{ backgroundColor: '#1976d2', color: 'white' }}>
                                    <Typography variant="h6" fontWeight="bold">
                                        Sales
                                    </Typography>
                                    <Typography fontSize="1.5rem" fontWeight="bold">
                                        {formatCurrency(totalOther + totalFit)}
                                    </Typography>
                                </Box>
                            </Box>



                        </Box>
                    </Collapse>
                </Box>
                <Box
                    sx={{
                        display: "grid",
                        gap: 3,
                        marginBottom: '10rem',
                    }}
                    mb={10}
                >
                    {total?.map((trader) => (
                        <Card
                            key={trader.ACID}
                            sx={{
                                boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.2)',
                                fontSize: "2rem",
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                cursor: 'pointer',
                                '&:hover': {
                                    boxShadow: '0px 10px 18px rgba(0, 0, 0, 0.43)',
                                    transform: 'scale(1.02)',
                                    transition: 'transform 0.2s ease-in-out',
                                },
                            }}

                            onClick={() => openDialog(trader.ACID)}
                        >
                            {/* for todays stats */}
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
                                    FIT: {formatCurrency(trader.FitOrderAmount) || "--"}
                                </Typography><Typography variant="h6" fontWeight="bold">
                                    Local: {formatCurrency(trader.OtherOrderAmount) || "--"}
                                </Typography>
                                <Typography variant="h5" fontWeight="bold">
                                    Promise: {trader.remarks || "--"}
                                </Typography>
                            </CardContent>

                            {/* for spos stats */}
                            <CardContent sx={{ gridColumn: 'span 3' }}>
                                {fieldsToDisplay?.map((key) => {
                                    const value = trader[key];
                                    if (value === undefined || value === null) return null;

                                    const isSpecial = special.includes(key);

                                    if (["Sale Date", "Recovery Date", "Credit Limit", "Balance", "number"].includes(key)) return null;
                                    if (key === "Turnover Days" && value < 7) return null;

                                    if (isSpecial) {
                                        let formattedDate = "";  // formatted dd/mm/yy date
                                        let rawDate = null;      // Date object for comparison
                                        let extraInfo = "";      // for non-date values like balance, credit, etc.

                                        if (key === "Sale" && trader["Sale Date"]) {
                                            rawDate = trader["Sale Date"];
                                            formattedDate = formatDate(rawDate);
                                        } else if (key === "lrecovery" && trader["Recovery Date"]) {
                                            rawDate = trader["Recovery Date"];
                                            formattedDate = formatDate(rawDate);
                                        } else if (key === "Credit Days" && trader["Credit Limit"]) {
                                            extraInfo = Math.round(trader["Credit Limit"]).toLocaleString();
                                        } else if (key === "Overdue" && trader["Balance"]) {
                                            extraInfo = Math.round(trader["Balance"]).toLocaleString();
                                        } else if (key === "ACID" && trader["number"]) {
                                            extraInfo = trader["number"];
                                        }

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
                                                                    : rawDate && isOneMonth(rawDate)
                                                                        ? "red"
                                                                        : "text.secondary",
                                                }}
                                            >
                                                <strong>
                                                    {`${key.includes("lrecovery") ? "L.Recovery" : key.includes("ale") ? "L.Sale" : key}:`}
                                                </strong>{" "}
                                                {displayValue}
                                                <span
                                                    style={{
                                                        color:
                                                            key === "Overdue"
                                                                ? "green"
                                                                : rawDate && isOneMonth(rawDate)
                                                                    ? "red"
                                                                    : "",
                                                    }}
                                                >
                                                    {(formattedDate || extraInfo) && ` | ${formattedDate || extraInfo}`}
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
            {/* </Box> */}
        </Container >
    );
};

export default TurnoverReport;