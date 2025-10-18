// ApiRequestPage.js
import React, { useState, useMemo, useEffect, useCallback }
    from 'react';
import {
    Box, TextField, Button, Typography, Alert, Autocomplete, Skeleton
} from '@mui/material';
import DataTable from './table';
import axios from 'axios';
import useLocalStorageState from 'use-local-storage-state';
import io from "socket.io-client";
import { useNavigate } from 'react-router-dom';


// GLOBAL CONSTANTS
const uniqueRowKey = '(row) => row.rn';
const Today = new Date().toISOString().split("T")[0];
const url = import.meta.env.VITE_API_URL;
// const surl = import.meta.env.VITE_SOCKET_URL;
// If your backend is running at 100.68.6.110:3001
// const socket = io(surl, {
//     transports: ["websocket"], // force websocket
// });


// GLOBAL UTILITIES
function unformatNumber(formattedValue) {
    if (typeof formattedValue === "number") return formattedValue;
    if (typeof formattedValue === "string") {
        const cleaned = formattedValue.replace(/,/g, "").trim();
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }
    return 0;

}

// navigator hook
const useHandleNavigate = () => {
    const navigate = useNavigate()

    const handleNavigate = async (doc) => {
        try {
            // Lock the invoice
            // const lock = `/invoices/${doc}/lock`;
            // await axios.put(`${url}${lock}`);

            // Navigate inside SPA (no reload)
            navigate(`/pack/${doc}`);
        } catch (error) {
            console.error("Failed to lock invoice:", error);
        }
    };

    return { handleNavigate };
};


function formatDate(isoString) {
    const now = new Date(isoString);
    const offsetMs = -5 * 60 * 60 * 1000;
    const adjusted = new Date(now.getTime() + offsetMs);
    const date = adjusted.toISOString().split("T")[0];
    const time = adjusted.toTimeString().slice(0, 5);
    return `${date} ${time}`;
}

const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

// ====== CUSTOM HOOKS ======

// Hook for managing filters
const useFilters = () => {
    const [filters, setFilters] = useLocalStorageState("FILTERS", {
        defaultValue: [
            { id: "route" },
            { id: "estimate #" },
            { id: "name" },
            { id: "status" },
        ],
    });

    const [endDate, setEndDate] = useLocalStorageState('endDate', {
        defaultValue: Today,
    });

    const handleFilterChange = useCallback((id, value) => {
        setFilters((prev) =>
            prev.map((f) =>
                f.id === id ? { ...f, name: value } : f
            )
        );
    }, []);

    return { filters, endDate, setEndDate, handleFilterChange };
};

// Hook for data fetching
const useDataFetching = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tableData, setTableData] = useLocalStorageState('pendingTableData', {
        defaultValue: []
    });
    const [amount, setAmount] = useLocalStorageState('amount', {
        defaultValue: '',
    });
    const [routes, setRoutes] = useState([]);
    const [usernames, setUsernames] = useState([]);



    const fetchData = async (requestBody) => {
        setLoading(true);
        setError('');
        setTableData([]);

        try {
            const apiUrl = `${url}/sales-report`;
            const response = await axios.get(apiUrl, { params: requestBody });

            if (response.data) {
                const rows = response.data;
                const cleanedRows = rows.map((row, id) => {
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

                // Calculate total amount
                const totalAmount = Math.round(
                    cleanedRows.reduce((sum, row) => sum + (unformatNumber(row.amount) || 0), 0)
                );
                setAmount(formatCurrency(totalAmount));

                // Extract unique usernames and routes
                const usernames = Array.from(new Set(cleanedRows.map(row => row.UserName)));
                const routes = Array.from(new Set(cleanedRows.map(row => row.route)));
                setUsernames(usernames);
                setRoutes(routes);

                return { success: true, data: response.data };
            } else {
                setError("Received a response, but the data format was unexpected.");
                return { success: false, message: "Data format unexpected" };
            }
        } catch (err) {
            console.error("API Error:", err);
            let errorMessage = "An unknown error occurred while fetching data.";

            if (err.response) {
                errorMessage = err.response.data?.message ||
                    err.response.data?.error ||
                    `Server error: ${err.response.status}`;
            } else if (err.request) {
                errorMessage = "No response received from the server.";
            } else {
                errorMessage = err.message;
            }

            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        tableData,
        amount,
        routes,
        usernames,
        fetchData
    };
};

// ====== COMPONENTS ======

// Filter Input Component
const FilterInput = React.memo(({ onSubmit, id, value, onChange, options = [] }) => {
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    return (
        <Autocomplete
            freeSolo
            options={Array.isArray(options) ? options : []}
            inputValue={inputValue || ""}
            onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
            onBlur={() => onChange(id, inputValue)}
            onChange={(event, newValue) => {
                setInputValue(newValue);
                onChange(id, newValue);
            }}
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

// Error Display Component
const ErrorDisplay = ({ error }) => {
    if (!error) return null;
    return <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>;
};

// Loading State Component
const LoadingState = () => (
    <>
        <br /><br />
        <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
        <br />
        <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
        <br />
        <Skeleton variant="rounded" width={"100%"} height={"25vh"} />
    </>
);

// Filter Section Component
const FilterSection = ({ filters, routes, statuses, onFilterChange, onSubmit, isAllowed }) => {
    const fields = filters?.filter(filter => !(filter.id.includes("status") && !isAllowed));
    return (
        <>
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
                {fields?.map(filter => (
                    <FilterInput
                        onSubmit={onSubmit}
                        key={filter.id}
                        id={filter.id}
                        options={filter.id.includes("route") ? routes : filter.id.includes("status") ? statuses : []}
                        value={filter.name || ""}
                        onChange={onFilterChange}
                    />
                ))}
            </Box>
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                <Button
                    onClick={onSubmit}
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
        </>
    );
};

// Summary Section Component
const SummarySection = ({ tableData, amount, isAllowed }) => {
    if (tableData.length === 0) return null;

    return (
        <Box display={"flex"} justifyContent={"space-between"}
            marginTop={5} fontSize={'1rem'} fontWeight={"bold!important"}>
            <Typography variant="h6" component="h2"
                sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: "bold" }}>
                TOTAL BILLS: {tableData.length}
            </Typography>
            {isAllowed && (
                <Typography variant="h6" component="h2"
                    sx={{ fontSize: { xs: "1.5rem", sm: "2rem" }, fontWeight: "bold" }}>
                    NET AMOUNT = {amount}
                </Typography>
            )}
        </Box>
    );
};

// Results Table Component
const ResultsTable = ({ data, columns, fetch, s }) => {
    const { handleNavigate } = useHandleNavigate()
    const handleLongPress = async (id) => {
        const status = s || "onHold";
        const confirmation = window.confirm(`Are you sure you want to put this on ${status}?`)

        if (confirmation) {
            await axios.put(`${url}/sale-report/onhold`, { id, status: status });
            await fetch();
        } else {
            console.log("Update cancelled");
        }
    };
    return (
        <Box sx={{ fontSize: "2rem" }}>
            <DataTable
                data={data}
                columns={columns}
                rowKey={uniqueRowKey}
                showPagination={true}
                handleClick={handleNavigate}
                handleLongPress={handleLongPress}
                rowsPerPageOptions={[5, 10, 25]}
                sx={{
                    '& .MuiDataGrid-cell': {
                        padding: '8px',
                        fontSize: '1rem',
                    },
                    '& .MuiDataGrid-columnHeaders': {
                        fontSize: '1rem',
                        fontWeight: 'bold',
                    },
                }}
            />
        </Box>
    );
};

// No Data Message Component
const NoDataMessage = ({ customerName }) => {
    if (!customerName) return null;
    return <Typography sx={{ mt: 2 }}>No data found for the current criteria.</Typography>;
};

// Main Component
const PackingList = () => {
    // USER INFO
    const user = JSON.parse(localStorage.getItem("user"));
    const userTypes = ['operator', 'admin'];
    const userType = user?.userType?.toLowerCase();
    const isAllowed = userTypes.includes(userType);
    const [customerName] = useLocalStorageState('customerName', { defaultValue: '' });

    // Use custom hooks
    const { filters, endDate, setEndDate, handleFilterChange } = useFilters();
    const {
        loading,
        error,
        tableData,
        amount,
        routes,
        usernames,
        fetchData
    } = useDataFetching();

    useEffect(() => {
        handleSubmit();
    }, [filters]);

    let statuses = ['estimate', 'onHold', 'invoice', 'all'];

    // if (isAllowed){
    //     statuses.push('invoice');
    // }
    // Memoized columns
    const memoizedColumns = useMemo(() => {
        return [
            { label: "Route", id: "route", minWidth: 150, align: 'center' },
            { label: "Customer", id: "UrduName", minWidth: 250, align: "right" },
            { label: "DOC #", id: "doc", minWidth: 100, align: 'center' },
            { label: "#", id: "rn", minWidth: 60, align: 'center' },
            { label: "DATE", id: "date", minWidth: 150, align: 'center' },
            ...(isAllowed
                ? [
                    { label: "USER", id: "UserName", minWidth: 180, align: 'center' },
                    { label: "AMOUNT", id: "amount", minWidth: 50, align: "right" },
                ]
                : []),
        ];
    }, [isAllowed]);

    // Memoized data
    const memoizedData = useMemo(() => tableData, [tableData]);

    // Initial data fetch
    useEffect(() => {
        handleSubmit();

        // socket.on("invoiceLocked", () => {
        //     console.log("locked")
        //     handleSubmit(); // 🔄 will be called on every socket emission
        // });

        // socket.on("invoiceUnlocked", () => {
        //     console.log('unlocked')
        //     handleSubmit(); // 🔄 will be called on every socket emission
        // });

        // return () => {
        //     socket.off("invoiceLocked"); // clean up when component unmounts
        //     socket.off("invoiceUnlocked"); // clean up when component unmounts
        // };
    }, []);

    // Handle form submission
    const handleSubmit = async () => {
        const [route, invoiceStatus, doc, customer] = filters.map(f => f?.name || null);

        const requestBody = {
            startDate: null,
            endDate: endDate ? new Date(endDate).toISOString().split("T")[0] : null,
            route,
            doc,
            invoiceStatus: invoiceStatus === 'all' ? '' : invoiceStatus ? invoiceStatus : "estimate",
            page: "pack",
            customer: customer || '',
        };

        await fetchData(requestBody);
    };


    return (
        <Box sx={{ px: { xs: 1, sm: 5 }, maxWidth: '1600px', margin: 'auto' }}>
            <ErrorDisplay error={error} />
            <br />

            <FilterSection
                filters={filters}
                routes={routes}
                statuses={statuses}
                onFilterChange={handleFilterChange}
                onSubmit={handleSubmit}
                isAllowed={isAllowed}
            />


            {loading && <LoadingState />}

            {tableData.length > 0 && (
                <Box>
                    <SummarySection
                        tableData={tableData}
                        amount={amount}
                        isAllowed={isAllowed}
                    />

                    <ResultsTable
                        data={memoizedData}
                        columns={memoizedColumns}
                        fetch={handleSubmit}
                        s={filters[1]?.name === "onHold" ? "estimate" : "onHold"}
                    />
                </Box>
            )}

            <NoDataMessage customerName={customerName} />
        </Box>
    );
};

export default PackingList;