// ApiRequestPage.js
import React, { useState, useMemo, useEffect, useCallback, useRef }
    from 'react';
import {
    Box,
    TextField,
    Button,
    Checkbox,
    FormControlLabel,
    Typography,
    CircularProgress,
    FormControl,
    InputLabel,
    Alert,
    Autocomplete,
    Paper,
    Select,
    MenuItem,
    IconButton, OutlinedInput, InputAdornment
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DataTable from './table'; // Your custom DataTable component
import axios from 'axios'
import useLocalStorageState from 'use-local-storage-state';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Skeleton } from '@mui/material';

// GLOBLE VARIABLES

const uniqueRowKey = '(row) => row.rn'; // The unique key for each row in your data
const Today = new Date().toISOString().split("T")[0];

function unformatNumber(formattedValue) {
    if (typeof formattedValue === "number") return formattedValue;

    if (typeof formattedValue === "string") {
        // Remove commas and whitespace
        const cleaned = formattedValue.replace(/,/g, "").trim();
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }

    return 0;
}

// Define columns for the DataTable - adjust these to match your API response



// GLOBAL FUNCTION
function formatDate(isoString) {
    const now = new Date(isoString);
    // const date = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    // const hours = ((d.getHours() - 5 + 24) % 24).toString().padStart(2, '0');
    // const minutes = d.getMinutes().toString().padStart(2, '0');
    // const time = `${hours}:${minutes}`;
    // const now = new Date();
    const offsetMs = -5 * 60 * 60 * 1000; // subtract 5 hours in milliseconds
    const adjusted = new Date(now.getTime() + offsetMs);

    // Format date and time
    const date = adjusted.toISOString().split("T")[0]; // YYYY-MM-DD
    const time = adjusted.toTimeString().slice(0, 5);   // HH:mm

    console.log("Date:", date);
    console.log("Time:", time);

    return `${date} ${time}`;
}

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const rawFilters = [
    { id: "route" },
    { id: "estimate #" },
    { id: "name" },
]

// URL
const url = import.meta.env.VITE_API_URL;

const PackingList = () => {
    console.log("list rendering or re-rendering");

    // USER INFO
    const user = JSON.parse(localStorage.getItem("user"));
    const userTypes = ['operator', 'admin']
    const userType = user?.userType?.toLowerCase();
    const isAllowed = userTypes.includes(userType);

    const [customerName, setCustomerName] = useLocalStorageState('customerName', {
        defaultValue: '',
    });

    const [filters, setFilters] = useLocalStorageState("FILTERS", {
        defaultValue: [
            { id: "route" },
            { id: "estimate #" },
            { id: "name" },
        ],
    });


    const [endDate, setEndDate] = useLocalStorageState('endDate', {
        defaultValue: Today,
    });

    const [amount, setAmount] = useLocalStorageState('amount', {
        defaultValue: '',
    });

    const [tableData, setTableData] = useLocalStorageState('pendingTableData', {
        defaultValue: []
    });
    const [routes, setRoutes] = useState([])
    const [usernames, setUsernames] = useState([])

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const memoizedData = useMemo(() => tableData, [tableData]);
    const memoizedColumns = useMemo(() => {
        return [
            { label: "Route", id: "route", minWidth: 40, align: 'center' },
            { label: "Customer", id: "UrduName", minWidth: 250, align: "right" },
            { label: "DOC #", id: "doc", minWidth: 80, align: 'center' },
            { label: "#", id: "rn", minWidth: 40, align: 'center' },
            { label: "DATE", id: "date", maxWidth: 20, align: 'center' },
            ...(isAllowed
                ? [
                    { label: "USER", id: "UserName", maxWidth: 10, align: 'center' },
                    { label: "AMOUNT", id: "amount", maxWidth: 20, align: "right", },
                ]
                : []),
        ];
    }, [isAllowed]);





    const FilterInput = React.memo(({ id, value, onChange, options = [] }) => {
        const [inputValue, setInputValue] = useState(value);

        useEffect(() => {
            setInputValue(value); // Sync with parent
        }, [value]);

        return (
            <Autocomplete
                freeSolo
                options={options}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
                onBlur={() => onChange(id, inputValue)}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        label={id}
                        sx={{ gridColumn: "span 1" }}
                        inputProps={{
                            ...params.inputProps,
                            inputMode: id.includes("#") ? "numeric" : ""
                        }}
                    />
                )}
            />
        );
    });


    useEffect(() => {
        console.log("re render");

        if (tableData && tableData.length > 0) {
            // Calculate total amount
            const totalAmount = Math.round(
                tableData.reduce((sum, row) => sum + (unformatNumber(row.amount) || 0), 0)
            );
            setAmount(formatCurrency(totalAmount));

            // Extract unique usernames and routes
            const usernames = Array.from(new Set(tableData.map(row => row.UserName)));
            const routes = Array.from(new Set(tableData.map(row => row.route)));

            setUsernames(usernames);
            setRoutes(routes);
        }
    }, [tableData]);




    const fetchData = async (requestBody) => {
        setLoading(true);
        setError('');
        setTableData([]); // Clear previous results

        try {
            const apiUrl = `${url}/sales-report`;
            const response = await axios.get(apiUrl, {
                params: requestBody
            });

            console.log(response.data)
            if (response.data) {
                const rows = response.data
                const cleanedRows = rows.map((row, id) => {
                    // const d = new Date(row.date);
                    // const formattedDate = d.toISOString().split("T")[0];

                    const formattedAmount = row.amount.toLocaleString("en-US", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });

                    return {
                        ...row,
                        rn: ++id,
                        date: formatDate(row.date) || null,
                        amount: formattedAmount
                    };
                });
                setTableData(cleanedRows);
                return { success: true, data: response.data };
            } else {
                setError("Received a response, but the data format was unexpected.");
                return { success: false, message: "Received a response, but the data format was unexpected." };
            }

        } catch (err) {
            console.error("API Error:", err);
            let errorMessage = "An unknown error occurred while fetching data.";

            if (err.response) {
                console.error("Error data:", err.response.data);
                console.error("Error status:", err.response.status);
                errorMessage = err.response.data?.message || err.response.data?.error || `Server error: ${err.response.status}`;
            } else if (err.request) {
                console.error("Error request:", err.request);
                errorMessage = "No response received from the server. Check network connection or server status.";
            } else {
                errorMessage = err.message;
            }
            setError(errorMessage);
            return { success: false, message: errorMessage };
        }
    };
    useEffect(() => {
        handleSubmit()
    }, [])

    useEffect(() => {
        console.log(filters)

    }, [filters])


    // Inside your ApiRequestPage component:
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(end.getDate() - 7);

    const formattedStart = start.toISOString().split("T")[0]; // "YYYY-MM-DD"

    const handleSubmit = async (event) => {


        const requestBody = {
            endDate: new Date(endDate).toISOString().split("T")[0] || null,
            startDate: null,
            route: filters[0].name || null,
            doc: filters[1].name || null,
            invoiceStatus: "estimate",
            page: "pack",
            customer: filters[2].name || '',
        };
        console.log(requestBody)

        const result = await fetchData(requestBody);
        console.log("API Result:", result);
        if (result.success) {
            console.log("Data fetched successfully:", result.data);
        } else {
            console.error("Failed to fetch data:", result.message);
        }

        setLoading(false); // Crucial: ensure loading is set to false after the operation.
    };

    const debounceRef = useRef(null);

    const handleFilterChange = useCallback((id, value) => {
        console.log("this is the value", value)
        const key = value
        console.log(key)
        setFilters((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, name: key } : f
            )

        );
    }, []);



    return (
        <Box sx={{ px: { xs: 1, sm: 5 }, maxWidth: '1600px', margin: 'auto' }}>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <br />
            <Typography variant="h4" marginBottom={3} fontWeight={"bold"}>
                Search
            </Typography >

            <Box
                sx={{
                    display: "grid",
                    gap: 2,
                    gridTemplateColumns: {
                        xs: "repeat(3, 1fr)",
                        sm: "repeat(3, 1fr)",
                    }
                }}
            >
                {
                    filters?.map(filter => (
                        // filter.id === "route" ? (
                        //     <Select
                        //         key={filter.id}
                        //         value={filter.name || ""}
                        //         onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                        //         displayEmpty
                        //         sx={{ gridColumn: "span 1" }}
                        //     >
                        //         <MenuItem value="">All</MenuItem>

                        //         {
                        //             routes.map(route => (
                        //                 <MenuItem value={route}>{route}</MenuItem>
                        //             ))
                        //         }

                        //     </Select>
                        // ) : (
                        <FilterInput
                            key={filter.id}
                            id={filter.id}
                            options={filter.id.includes("route") ? routes : []}
                            value={filter.name || ""}
                            onChange={handleFilterChange}
                        />
                        // )
                    ))
                }

            </Box>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    sx={{
                        textTransform: "uppercase",
                        fontSize: "1.3rem",
                        minWidth: 150,
                    }}
                >
                    Filter
                </Button>
            </Box>
            {loading && (
                <>
                    <br />
                    <br />

                    <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
                    <br />
                    <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
                    <br />
                    <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
                </>
            )}
            {tableData.length > 0 && (
                <Box>


                    <Box
                        display={"flex"}
                        justifyContent={"space-between"}
                        marginTop={5}
                        fontSize={'1rem'}
                        fontWeight={"bold!important"}
                    >
                        <Typography variant="h6" gutterBottom component="h2" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: "bold" }}>
                            TOTAL BILLS: {tableData.length}
                        </Typography>
                        {isAllowed && (
                            <Typography variant="h6" gutterBottom component="h2" sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: "bold" }}>
                                NET AMOUNT = {amount}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{ fontSize: "2rem" }}

                    >
                        <DataTable
                            data={memoizedData}
                            columns={memoizedColumns}
                            rowKey={uniqueRowKey}
                            showPagination={true}
                            rowsPerPageOptions={[5, 10, 25]} // You can customize this per table instance
                            sx={{
                                fontSize: '10rem',
                                '& .MuiDataGrid-cell': {
                                    padding: '8px',
                                    fontSize: '10rem', // Increase this to change font size

                                },
                                '& .MuiDataGrid-columnHeaders': {
                                    fontSize: '1rem',
                                    fontWeight: 'bold',
                                },
                            }}
                        />
                    </Box>
                </Box>
            )}

            {/* Show message if submitted but no data and no error */}
            {!loading && !error && tableData.length === 0 && customerName && (
                <Typography sx={{ mt: 2 }}>No data found for the current criteria.</Typography>
            )}
        </Box>
    );
};

export default PackingList;