// ApiRequestPage.js
import React, { useState, useMemo, useEffect }
  from 'react';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Typography,
  Autocomplete,
  CircularProgress,
  FormControl,
  InputLabel,
  Alert,
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


// GLOBLE VARIABLES
const user = JSON.parse(localStorage.getItem("user"));
const userTypes = ['operator', 'admin']
const userType = user?.userType?.toLowerCase();
const isAllowed = userTypes.includes(userType);
const uniqueRowKey = '(row) => row.rn'; // The unique key for each row in your data
const Today = new Date().toISOString().split("T")[0];

// Define columns for the DataTable - adjust these to match your API response
const ledgerColumns = [
  { label: "#", id: "rn", minWidth: 40 },
  // { label: "Date", id: "date", minWidth: 90, format: (val) => new Date(val).toLocaleDateString() },
  { label: "Doc#", id: "doc", minWidth: 80 },
  { label: "Customer", id: "UrduName", minWidth: 170, align: "right" },
  { label: "Amount", id: "amount", minWidth: 40, align: "right", render: val => formatCurrency(val) },
  ...(isAllowed
    ? [
      { label: "Route", id: "route", minWidth: 40 },
      { label: "USER", id: "UserName", minWidth: 60 },
    ]
    : []),
];

// GLOBAL FUNCTION
const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};


// URL
const url = import.meta.env.VITE_API_URL;

const SalesReport = () => {
  const [customerName, setCustomerName] = useLocalStorageState('customerName', {
    defaultValue: '',
  });

  const [name, setName] = useState("")

  const [route, setRoute] = useLocalStorageState('route', {
    defaultValue: '',
  });

  const [startDate, setStartDate] = useLocalStorageState('startDate', {
    defaultValue: Today,
  });

  const [endDate, setEndDate] = useLocalStorageState('endDate', {
    defaultValue: Today,
  });

  const [isInvoice, setIsInvoice] = useLocalStorageState('isInvoice', {
    defaultValue: false,
  });

  const [isEstimate, setIsEstimate] = useLocalStorageState('isEstimate', {
    defaultValue: false,
  });

  const [amount, setAmount] = useLocalStorageState('amount', {
    defaultValue: '',
  });

  const [tableData, setTableData] = useLocalStorageState('salesTableData', {
    defaultValue: []
  });
  const [routes, setRoutes] = useState([])
  const [usernames, setUsernames] = useState([])

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');



  // Format tomorrow's date as YYYY-MM-DD
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() - 1); // Example: 7 days before today
    return d.toISOString().split("T")[0];
  }, [today]);

  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 1); // 7 days after today
    return d.toISOString().split("T")[0];
  }, [today]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    if (!isAllowed && (!startDate || startDate < today)) {
      setStartDate(today);
    }

    // Ensure end date is at least today too
    if (!isAllowed && !endDate || endDate < today) {
      setEndDate(today);
    }
  }, []);

  useEffect(() => {
    if (tableData && tableData.length > 0) {

      let total = tableData.reduce((sum, row) => sum + (row.amount || 0), 0);
      total = formatCurrency(Math.round(total));
      setAmount(total);
      const users = [...new Set(tableData.map(item => item.UserName))];
      const getRoutes = [...new Set(tableData.map(item => item.route))];

      setRoutes(getRoutes)
      setUsernames(users)

    }
  }, [tableData])

  const fetchData = async (requestBody) => {
    setLoading(true);
    setError('');
    setTableData([]); // Clear previous results

    try {
      const apiUrl = `${url}/sales-report`;
      const response = await axios.get(apiUrl, {
        params: requestBody
      });

      if (response.data) {
        setTableData(response.data);
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

  // Inside your ApiRequestPage component:

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!startDate || !endDate) {
      setError("Please select both start and end dates.");
      return;
    }

    const oneDay = 24 * 60 * 60 * 1000;
    if ((startDate - endDate) > oneDay) {
      setError("End date cannot be before start date.");
      return;
    }

    const requestBody = {
      startDate: new Date(startDate).toISOString().split("T")[0] || null,
      endDate: new Date(endDate).toISOString().split("T")[0] || null,
      route: route || '',
      customer: '',   // renamed from `user` to `customer`
      description: '',
      invoiceStatus: isInvoice && isEstimate ? "" : isInvoice ? "Invoice" : isEstimate ? "Estimate" : '',
      user: isAllowed ? name : user?.username,
    };

    const result = await fetchData(requestBody);
    if (result.success) {
    } else {
      console.error("Failed to fetch data:", result.message);
    }

    setLoading(false); // Crucial: ensure loading is set to false after the operation.
  };

  return (
    <Box sx={{ px: { xs: 1, sm: 5 }, maxWidth: '1600px', margin: 'auto' }}>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* <TextField
            label="Customer Name "
            variant="outlined"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            fullWidth
            required
          /> */}

          {/* for Date */}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)' } }}>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              minDate={isAllowed ? null : minDate}
              maxDate={isAllowed ? null : maxDate}
              customInput={
                <TextField
                  fullWidth
                  label="Start Date"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              }
            />
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              dateFormat="dd/MM/yyyy"
              placeholderText="DD/MM/YYYY"
              minDate={isAllowed ? null : startDate}
              maxDate={isAllowed ? null : maxDate}
              customInput={
                <TextField
                  fullWidth
                  label="End Date"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                />
              }
            />
          </Box>

          {/* for ROUTE */}
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' }, alignItems: "center" }}>
            <Box>
              <FormControlLabel
                control={<Checkbox checked={isInvoice} onChange={(e) => setIsInvoice(e.target.checked)} />}
                label="Invoice"
              />
              <FormControlLabel
                control={<Checkbox checked={isEstimate} onChange={(e) => setIsEstimate(e.target.checked)} />}
                label="Estimate"
              />
            </Box>
            {/* route for user */}
            {!isAllowed && (
              <TextField
                label="Route"
                variant="outlined"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                fullWidth
                required={!isAllowed}
              />
            )}

            {/* routes and users for admin */}
            {isAllowed && (
              <>
                <Autocomplete
                  freeSolo
                  options={routes}
                  value={route}
                  onChange={(event, newValue) => {
                    setRoute(newValue || "");
                  }}
                  onInputChange={(event, newValue) => {
                    setRoute(newValue || "");
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Route"
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="user-label">User</InputLabel>
                  <Select
                    labelId="user-label"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    input={
                      <OutlinedInput
                        label="User"
                        endAdornment={
                          name && (
                            <InputAdornment position="end" sx={{ mr: 2 }} >
                              <IconButton
                                size="small"
                                onClick={() => setName("")}
                                edge="end"
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      />
                    }
                  >
                    {usernames.map((u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>

            )}


            <Button
              type="submit"
              variant="contained"
              color="dark"
              disabled={loading}
              sx={{ alignSelf: 'center', backgroundColor: 'rgba(24, 24, 24, 0.85)', color: 'white', height: { xs: "70%", sx: "85%" }, fontSize: "1.2rem" }}
            >
              {loading ? <CircularProgress size={24} /> : 'GENERATE'}
            </Button>
          </Box>

        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tableData.length > 0 && (
        <Box>
          <Box
            display={"flex"}
            justifyContent={"space-between"}
            marginTop={10}
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
              data={tableData}
              columns={ledgerColumns}
              rowKey={uniqueRowKey}
              isLedgerTable={true}
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

export default SalesReport;