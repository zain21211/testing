import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Typography,
    TextField,
    Button,
    Paper,
    CircularProgress,
    Alert,
    IconButton,
    Tooltip,
    Divider,
    Autocomplete,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import PrintIcon from "@mui/icons-material/Print";
import FilterListIcon from "@mui/icons-material/FilterList";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import DataTable from "./table";
import { format } from "date-fns";
import debounce from "lodash/debounce";

const url = import.meta.env.VITE_API_URL;

const PendingDemand = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [routes, setRoutes] = useState([]);
    const [companies, setCompanies] = useState([]);
    
    // Filters
    const [filters, setFilters] = useState({
        route: "",
        company: "",
        date: new Date(),
    });

    const columns = [
        { 
            id: "TotalQty", 
            label: "Total Qty", 
            minWidth: 100, 
            align: "center",
            render: (val) => <b style={{ fontSize: '1.2rem' }}>{val}</b>
        },
        { id: "ProductName", label: "Product Name", minWidth: 250, align: "right" },
        { id: "code", label: "Code", minWidth: 100, align: "center" },
    ];

    const fetchRoutes = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await axios.get(`${url}/coa/routes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                const allRoutes = [...(res.data.kr || []), ...(res.data.sr || [])];
                setRoutes(allRoutes);
            }
        } catch (err) {
            console.error("Error fetching routes:", err);
        }
    };

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem("authToken");
            const res = await axios.get(`${url}/products/companies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setCompanies(res.data);
            }
        } catch (err) {
            console.error("Error fetching companies:", err);
        }
    };

    const fetchSummary = useCallback(async (currentFilters) => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("authToken");
            const response = await axios.get(`${url}/pending-demand`, {
                params: {
                    route: currentFilters.route,
                    company: currentFilters.company,
                    date: format(currentFilters.date, "yyyy-MM-dd"),
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            setData(response.data);
        } catch (err) {
            console.error("Error fetching pending demand:", err);
            setError("Failed to fetch pending demand summary. Please check your connection.");
        } finally {
            setLoading(false);
        }
    }, []);

    const debouncedFetch = useRef(
        debounce((f) => fetchSummary(f), 500)
    ).current;

    useEffect(() => {
        fetchRoutes();
        fetchCompanies();
    }, []);

    useEffect(() => {
        debouncedFetch(filters);
    }, [filters, debouncedFetch]);

    const handleDateChange = (date) => {
        setFilters((prev) => ({ ...prev, date }));
    };

    const handlePrint = () => {
        window.print();
    };

    const filterInputStyles = {
        '& .MuiInputBase-root': {
            borderRadius: '10px',
            background: 'white',
        },
        '& .MuiInputBase-input': { 
            fontSize: '1.2rem', 
            fontWeight: '900',
            padding: '12px 14px' 
        },
        '& .MuiInputLabel-root': {
            fontSize: '1.1rem',
            fontWeight: '900',
            color: 'primary.main'
        }
    };

    return (
        <Box sx={{ p: { xs: 0.5, md: 2 }, background: "#f5f6fa", minHeight: "100vh" }}>
            <Paper 
                elevation={6} 
                sx={{ 
                    p: 2, 
                    mb: 2, 
                    borderRadius: "15px", 
                    position: "sticky", 
                    top: 64,
                    zIndex: 100,
                    border: '1px solid #e0e0e0',
                    '@media print': { display: 'none' } 
                }}
            >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <FilterListIcon sx={{ color: "primary.main", fontSize: 24 }} />
                        <Typography variant="h6" fontWeight="900" color="text.primary">
                            FILTERS
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Print Summary">
                            <IconButton onClick={handlePrint} color="primary" size="small" sx={{ border: "1px solid", borderRadius: "8px" }}>
                                <PrintIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={() => fetchSummary(filters)}
                            size="small"
                            sx={{ borderRadius: "8px", px: 2, fontWeight: '900' }}
                        >
                            REFRESH
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ mb: 2 }} />

                {/* Using Flexbox instead of Grid for absolute width control */}
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', width: '100%' }}>
                    
                    <Box sx={{ flex: 1 }}>
                        <Autocomplete
                            options={routes}
                            value={filters.route}
                            onChange={(event, newValue) => setFilters(prev => ({ ...prev, route: newValue || "" }))}
                            onInputChange={(event, newInputValue) => setFilters(prev => ({ ...prev, route: newInputValue }))}
                            renderInput={(params) => (
                                <TextField {...params} label="Route" variant="outlined" fullWidth sx={filterInputStyles} />
                            )}
                            freeSolo
                            disableClearable={false}
                        />
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Autocomplete
                            options={companies}
                            value={filters.company}
                            onChange={(event, newValue) => setFilters(prev => ({ ...prev, company: newValue || "" }))}
                            onInputChange={(event, newInputValue) => setFilters(prev => ({ ...prev, company: newInputValue }))}
                            renderInput={(params) => (
                                <TextField {...params} label="Company" variant="outlined" fullWidth sx={filterInputStyles} />
                            )}
                            freeSolo
                            disableClearable={false}
                        />
                    </Box>

                    <Box sx={{ width: '150px', flexShrink: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 1, mb: 0.2, fontSize: '0.75rem', fontWeight: '900', color: 'primary.main', display: 'block' }}>
                            DATE
                        </Typography>
                        <DatePicker
                            selected={filters.date}
                            onChange={handleDateChange}
                            dateFormat="dd-MMM-yy"
                            customInput={
                                <TextField
                                    fullWidth
                                    variant="outlined"
                                    sx={{ 
                                        ...filterInputStyles,
                                        '& .MuiInputBase-input': { 
                                            ...filterInputStyles['& .MuiInputBase-input'],
                                            fontSize: '1rem',
                                            padding: '12px 8px',
                                            textAlign: 'center'
                                        } 
                                    }}
                                />
                            }
                        />
                    </Box>
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: "10px" }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ position: "relative" }} id="print-area">
                <Box sx={{ display: 'none', '@media print': { display: 'block', mb: 2 } }}>
                    <Typography variant="h4" textAlign="center" fontWeight="bold">Pending Demand Summary</Typography>
                    <Typography textAlign="center">Route: {filters.route || "Any"} | Company: {filters.company || "Any"} | Date: {format(filters.date, "dd-MMM-yy")}</Typography>
                </Box>

                {loading && (
                    <Box
                        sx={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            bgcolor: "rgba(255,255,255,0.7)",
                            zIndex: 2,
                            borderRadius: "15px",
                        }}
                    >
                        <CircularProgress />
                    </Box>
                )}

                <DataTable
                    data={data}
                    columns={columns}
                    rowKey="code"
                    tableHeight={600}
                />
            </Box>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'background.paper', borderRadius: '10px', boxShadow: 1 }}>
                <Typography variant="h6" fontWeight="900" color="primary.main" sx={{ fontSize: '1.3rem' }}>
                    Total Qty: {data.reduce((sum, item) => sum + (item.TotalQty || 0), 0)}
                </Typography>
                <Typography variant="h6" fontWeight="900" sx={{ color: 'text.secondary', fontSize: '1.2rem' }}>
                    Items: {data.length}
                </Typography>
            </Box>

            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #print-area, #print-area * {
                            visibility: visible;
                        }
                        #print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .MuiTablePagination-root {
                            display: none !important;
                        }
                    }
                    .react-datepicker-wrapper {
                        width: 100% !important;
                    }
                    .react-datepicker__input-container {
                        width: 100% !important;
                    }
                    .MuiAutocomplete-inputRoot {
                        padding-top: 0 !important;
                        padding-bottom: 0 !important;
                    }
                `}
            </style>
        </Box>
    );
};

export default PendingDemand;
