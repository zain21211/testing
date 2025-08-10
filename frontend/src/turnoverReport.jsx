import axios from 'axios';
import DataTable from './table';
import useLocalStorage from 'use-local-storage-state';
import { useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import {
    FormControl,
    InputLabel,
    MenuItem,
    Select
} from '@mui/material';
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
// import { use } from 'react';
// import { set } from 'date-fns';

const user = JSON.parse(localStorage.getItem("user"));
const userType = user?.userType?.toLowerCase()
const username = user?.username?.toLowerCase()

const isZain = username?.includes('zain')
const isAdmin = userType?.includes('admin')

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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="done">Done</MenuItem>
                <MenuItem value="all">All</MenuItem>
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

const TurnoverReport = () => {
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
    const [all, setAll] = useState([])
    const [total, setTotal] = useState([]); // for trader data
    const [filter, setFilter] = useState('pending');


    const onChange = (value) => {
        setFilter(value);
        if (value === 'all') {
            setTotal(all);
        } else if (value === 'done') {
            setTotal(done);
        } else {
            setTotal(pending);
        }
    };


    // setTimeout(fetchReport, 50000) // fetch every 5 minutes;
    useEffect(() => {
        if (turnoverData) {
            const data = turnoverData;
            const done = data.filter(item => item.payment || item.remarks || item.orderAmount)
            const pending = data.filter(item => !(item.payment || item.remarks || item.orderAmount))
            const overdue = total.reduce((sum, item) => sum + (parseFloat(item.Overdue) || 0), 0);
            const payment = total.reduce((sum, item) => sum + (parseFloat(item.payment) || 0), 0);
            const sale = total.reduce((sum, item) => sum + (parseFloat(item.orderAmount) || 0), 0);
            const action = done.length

            setAll(data)
            setDone(done)
            setActions(action)
            setTotalSale(sale)
            setPending(pending)
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
        try {
            const res = await axios.get(`${url}/turnover`, {
                params: {
                    route,
                    spo: spo || username,

                },
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            setTurnoverData(res.data);
            setTotal(res.data);

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
    }

    setInterval(fetchReport, 5 * 60 * 1000) // fetch every 5 minutes;

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
                <Box
                    sx={{
                        borderRadius: '.5rem',
                        position: 'sticky',
                        backgroundColor: "white",
                        display: 'grid',
                        gridTemplateColumns: (isZain || isAdmin) ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
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
                    <Button variant='contained' onClick={fetchReport}>
                        GET
                    </Button>
                    <StatusFilter handleChange={onChange} />


                    <Box
                        borderTop={'1px solid black'}
                        paddingY={2}
                        gridColumn={(isZain || isAdmin) ? 'span 4' : 'span 3'}
                        display={'grid'}
                        gridTemplateColumns={'repeat(8, 1fr)'}
                        textAlign={'center'}
                        alignItems={'center'}
                    // gap={1}
                    >

                        {/* for action and total cust */}
                        <Typography
                            variant='h6'
                            fontWeight={'bold'}
                            gridColumn={'span 2'}

                        >
                            <span style={{ display: 'block' }}>Customers </span>
                            <b style={{ fontSize: '2rem' }}><span style={{ color: 'green' }}>{Actions}</span> / {turnoverData?.length}</b>
                        </Typography>

                        {/* for overdue */}
                        <Typography
                            variant='h5'
                            fontWeight={'bold'}
                            color='#f70d04ff'
                            gridColumn={'span 2'}
                        >
                            Overdue: <span style={{ fontWeight: 'bold', display: 'block', fontSize: '2rem' }}>{formatCurrency(totalOverdue)}</span>
                        </Typography>

                        {/* for payment */}
                        <Typography
                            variant='h5'
                            fontWeight={'bold'}
                            color='green'
                            gridColumn={'span 2'}
                        >
                            Recovery: <span style={{ fontWeight: 'bold', display: 'block', fontSize: '2rem' }}>{formatCurrency(totalPayment)}</span>
                        </Typography>

                        {/* for total sale */}
                        <Typography
                            variant='h5'
                            fontWeight={'bold'}
                            color='green'
                            gridColumn={'span 2'}
                        >
                            Sale: <span style={{ fontWeight: 'bold', display: 'block', fontSize: '2rem' }}>{formatCurrency(totalSale)}</span>
                        </Typography>
                    </Box>
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
                                    Order: {formatCurrency(trader.orderAmount) || "--"}
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
        </Container >
    );
};

export default TurnoverReport;  