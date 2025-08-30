// src/pages/Login.jsx or src/components/Login.jsx
// src/pages/Login.jsx or src/components/Login.jsx
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios"; // Ensure you have axios installed
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom"; // Renamed Link to RouterLink to avoid conflict with MUI Link

// Material UI Components
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Link as MuiLink, // MUI Link
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@mui/material";

// Material UI Icons
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
// import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined"; // Not used in the form currently
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Checkbox from '@mui/material/Checkbox';
import Stack from "@mui/material/Stack";

import FormControlLabel from '@mui/material/FormControlLabel';

const formatCurrency = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  const rawNumericString = String(value).replace(/,/g, "");
  if (rawNumericString.trim() === "") {
    return "";
  }
  const num = Number(rawNumericString);
  if (isNaN(num)) {
    return "";
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};
const url = import.meta.env.VITE_API_URL; // Update with your actual API URL
// const CustomerDetails = React.lazy(() => import('./components/CustomerDetails')); // Lazy load the component
const CustomerDetails = ({
    acid,
    isLoading,
    loadingFinancials,
    cashAmount,
    error,
}) => {

    const [balance, setBalance] = useState("");
    const [remainingBalance, setRemainingBalance] = useState("");
    const location = useLocation()
    const routePath = location.pathname
    const [overDue, setOverDue] = useState("");
    // const [error, setError] = useState(null);
const navigate = useNavigate();

      useEffect(() => {
        const fetchCustomerFinancials = async () => {
          if (!acid) {
            // If no selected customer, or selected customer has no acid, clear balance
            // This might happen if handleFetchData is called with null
            setBalance("");
            return;
          }
          try {
            const responseBal = await axios.get(`${url}/balance`, {
              params: {
                acid,
                date: new Date().toISOString().split("T")[0],
              },
            });
            const { balance: fetchedBalance } = responseBal.data;
            setBalance(formatCurrency(Math.round(fetchedBalance)));
    
            // overdue api
            const responseOver = await axios.get(`${url}/balance/overdue`, {
              params: {
                acid,
                date: new Date().toISOString().split("T")[0],
              },
              // headers: { Authorization: `Bearer ${token}` }, // Add token
            });
    
            const { overDue } = responseOver.data;
            setOverDue(formatCurrency(Math.round(overDue)));
          } catch (err) {
            setBalance(""); // Clear balance on error
          } 
        };
    
        if (acid) {
          // Condition to fetch
          fetchCustomerFinancials();
        } else {
          // If there's no valid selectedCustomer to fetch for, ensure balance is cleared.
          // This handles cases where selectedCustomer becomes null or loses its acid.
          setBalance("");
          setRemainingBalance(""); // Also clear remaining as it depends on balance
        }
      }, [acid]);

        const handleLedgerClick = useCallback(() => {
            console.log("clicked ledger")
          if (!acid) {
            // Maybe show an alert or error message
            return;
          }
          const endDateObj = new Date();
          const startDateObj = new Date();
          startDateObj.setMonth(startDateObj.getMonth() - 3);
      
          // Format dates as YYYY-MM-DD for the URL params
          const ledgerStartDate = startDateObj.toISOString().split("T")[0];
          const ledgerEndDate = endDateObj.toISOString().split("T")[0];
      
          // Construct the URL for the ledger page
          const url = `/ledger?&acid=${encodeURIComponent(
            acid
          )}&startDate=${encodeURIComponent(
            ledgerStartDate
          )}&endDate=${encodeURIComponent(
            ledgerEndDate
          )}&from=${encodeURIComponent(routePath)}`;
      
          // Use navigate or window.open depending on desired behavior
          // window.open(url, "_blank"); // Open in new tab
          navigate(url); // Navigate within the app (might need react-router setup)
        }, [acid, navigate]); // Added navigate dependency

        useEffect(() => {
            console.log("Balance or cashAmount changed:", balance, cashAmount);
        },[cashAmount, balance]);
    return (
    <Stack spacing={2} >
        <Box sx={{backgroundColor:"white", borderRadius:".5rem"
        }}>
            {/* Customer Details Section */}
            {acid && (
                <Box
                    sx={{
                        minHeight: "3em",
                        border: "1px solid #eee",
                        p: 1,
                        borderRadius: 1,
                        mt: 1,
                    }}
                >
                    {(isLoading || loadingFinancials) && !error && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            display="flex"
                            alignItems="center"
                            gap={1}
                        >
                            <CircularProgress size={16} /> Loading customer...
                        </Typography>
                    )}
                    {error && !isLoading && (
                        <Alert severity="error" sx={{ fontSize: "0.9rem", py: 0.5 }}>
                            {error}
                        </Alert>
                    )}

                    {!isLoading && !error && acid && (
                        <>

                        </>
                    )}
                    {!isLoading && !error && !acid && (
                        <Typography variant="body2" color="textSecondary">
                            Enter valid Account ID or search.
                        </Typography>
                    )}

                    {/* This Box now correctly wraps Description, Balance, and Remaining for layout as per original */}
                    <Box
                        display="grid"
                        gridTemplateColumns="repeat(6, 1fr)" // Original: 4 columns
                        alignItems={"center"}
                        gap={2}
                    >
                        {/* Ledger Button — only if customer is selected */}
                        {acid && (
                            <Box
                                sx={{
                                    gridColumn: {
                                        xs: "span 6", // Half width on xs
                                        sm: "span 2",
                                        md: "span 2",
                                        xl: "span 2",
                                    },
                                    height: "100%", // Full height of the grid cell
                                }}
                            >
                                <Button
                                    onClick={handleLedgerClick}
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    sx={{

                                        height: "100%", // Make button fill container height
                                        transition: "background-color 0.3s, color 0.3s",
                                        letterSpacing: "0.25em",
                                        "&:hover": {
                                            backgroundColor: "primary.dark", // Darker shade on hover
                                            color: "white",
                                            borderColor: "primary",
                                        },
                                    }}
                                >
                                    LEDGER
                                </Button>
                            </Box>
                        )}

                        {/* for description */}


                        {/* Balance and Remaining (side by side) */}
                        {/* Balance and Remaining (side by side) */}
                        {balance !== null && balance !== "" && acid && (
                            <Box
                                display="grid"
                                gridTemplateColumns="repeat(3, 1fr)"
                                gridColumn={{ xs: "span 6", sm: "span 6" }}
                                alignItems="center"
                                gap={2}
                            >
                                <TextField
                                    label="Balance"
                                    type="text"
                                    value={balance}
                                    disabled
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        "& .MuiInputBase-input.Mui-disabled": {
                                            fontWeight: "bold",
                                            textAlign: "right",
                                            WebkitTextFillColor: "red !important",
                                            fontSize: "1.5rem",
                                        },
                                    }}
                                />
                                <TextField
                                    label="Remaining"
                                    type="text"
                                    value={((parseFloat(balance.replace(/,/g, '')) || 0) + parseFloat(cashAmount))} // Assuming cashAmount is defined in the parent component
                                    disabled
                                    size="small"
                                    InputLabelProps={{ shrink: true }}
                                    sx={{
                                        "& .MuiInputBase-input.Mui-disabled": {
                                            fontWeight: "bold",
                                            textAlign: "right",
                                            WebkitTextFillColor: "green !important",
                                            fontSize: "1.5rem",
                                        },
                                    }}
                                />
                                {/* OVERDUE Field */}
                                {overDue !== null && (
                                    <TextField
                                        label="OVERDUE"
                                        type="text"
                                        value={overDue}
                                        disabled
                                        fullWidth
                                        InputLabelProps={{
                                            shrink: true,
                                            sx: {
                                                color: "black !important",
                                                fontWeight: "bold !important",
                                                backgroundColor: "white !important",
                                                paddingRight: 2,
                                                paddingLeft: "7px",
                                                borderRadius: "4px",
                                                fontSize: "1rem",
                                            },
                                        }}
                                        InputProps={{
                                            sx: {
                                                "& input.Mui-disabled": {
                                                    WebkitTextFillColor:
                                                        overDue !== "0.00"
                                                            ? "white"
                                                            : "black !important",
                                                    textAlign: "right",
                                                    fontWeight: "bold",
                                                    fontSize: "1.5rem",
                                                },
                                            },
                                        }}
                                        sx={{
                                            width: { xs: "100%", md: "150px" },
                                            "& .MuiOutlinedInput-root": {
                                                backgroundColor:
                                                    overDue !== "0.00" ? "red" : "transparent",
                                                "& fieldset": {
                                                    borderColor:
                                                        overDue !== "0.00" ? "red" : undefined,
                                                },
                                                "&:hover fieldset": {
                                                    borderColor:
                                                        overDue !== "0.00" ? "red" : undefined,
                                                },
                                                "&.Mui-focused fieldset": {
                                                    borderColor:
                                                        overDue !== "0.00" ? "red" : undefined,
                                                },
                                            },
                                        }}
                                    />
                                )}
                            </Box>
                        )}
                    </Box>
                </Box>
            )}
        </Box>

        {/* Payment Method Inputs */}
        <Box
            sx={{
                textAlign: "center",
                mb: 2,
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(3, 1fr)",
                    sm: "repeat(6, 1fr)",
                },
                gap: 1.5,
                alignItems: "center",
            }}
        >
            </Box>
    </Stack>
    )
}

export default CustomerDetails;