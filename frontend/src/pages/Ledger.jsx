import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useSearchParams } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import { useDispatch } from "react-redux";
import DataTable from "./table"; // Assuming DataTable is in a sibling file
import LedgerSearchForm from "./CustomerSearch"; // Assuming CustomerSearch is in a sibling file
import {
  clearSelection,
  setIDWithKey
} from "./store/slices/CustomerSearch"; // Adjust path as needed

//================================================================================
// 1. UTILITIES & CONSTANTS
//================================================================================

const API_URL = `${import.meta.env.VITE_API_URL}/ledger`;
const USAGE_KEY = "ledger";
const UNIQUE_ROW_KEY = "_id"; // Key for React list items

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatDate = (value) => {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
};

const BASE_LEDGER_COLUMNS = [
  { id: "Date", label: "Date", align: "center", render: (value) => (value ? formatDate(value) : "N/A"), width: 100, minWidth: 80 },
  { id: "Doc", label: "Doc", align: "left", render: (value) => (value ? value : "N/A"), width: 80, minWidth: 60 },
  { id: "Narration", label: "Narration", align: "left", width: 300, minWidth: 150 },
  { id: "Debit", label: "Debit", align: "right", render: (value) => formatCurrency(value), width: 120, minWidth: 80 },
  { id: "Credit", label: "Credit", align: "right", render: (value) => formatCurrency(value), width: 120, minWidth: 80 },
  { id: "Total", label: "Balance", align: "right", render: (value) => formatCurrency(value), width: 120, minWidth: 80 },
];


//================================================================================
// 2. HELPER COMPONENTS (Single Responsibility)
//================================================================================

/**
 * Displays the summary of total debit, credit, and net balance.
 */
const LedgerSummary = React.memo(({ summary, balanceInc }) => {
  const { totalDebit, totalCredit, netBalance } = summary;
  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box
          display="grid"
          justifyItems="space-between"
          gap={2}
          alignItems="center"
          textAlign="center"
          gridTemplateColumns={{
            xs: "repeat(3, 1fr)",
            sm: "repeat(3, 1fr)",
          }}
        >
          <Typography variant="subtitle1">
            <b>Total Debit:</b> {formatCurrency(totalDebit)}
          </Typography>
          <Typography variant="subtitle1">
            <b>Total Credit:</b> {formatCurrency(totalCredit)}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              backgroundColor: balanceInc ? "red" : "green",
              p: 1,
              color: "white",
              fontWeight: "bold",
              borderRadius: 1,
            }}
          >
            <b>Balance {balanceInc ? "Increase" : "Decrease"}:</b>{" "}
            {formatCurrency(netBalance)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
});

/**
 * Displays contextual messages for loading, error, or data states.
 */
const LedgerMessages = React.memo(({ loading, error, searchAttempted, rowCount }) => {
  if (loading) {
    return (
      <Paper sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
        <CircularProgress size={40} />
        <Typography sx={{ ml: 2 }}>Loading ledger data...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="filled" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (searchAttempted && rowCount === 0) {
    return (
      <Paper sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary">No records found for the selected criteria.</Typography>
      </Paper>
    );
  }

  if (!searchAttempted && rowCount === 0) {
    return (
      <Paper sx={{ textAlign: "center", py: 8 }}>
        <Typography color="text.secondary">Enter customer details and date range to view ledger.</Typography>
      </Paper>
    );
  }

  return null;
});

/**
 * Renders the main data table for the ledger.
 */
const LedgerTable = React.memo(({ rows, columns }) => {
  return (
    <Card elevation={2} sx={{ width: "100%" }}>
      <Box sx={{ width: "100%", margin: "auto", textAlign: "center" }}>
        <DataTable
          data={rows}
          columns={columns}
          rowKey={UNIQUE_ROW_KEY}
          isLedgerTable={true}
          showPagination={true}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      </Box>
    </Card>
  );
});

//================================================================================
// 3. CUSTOM HOOKS
//================================================================================

/**
 * A custom hook to dynamically adjust table column widths based on screen size.
 */
const useResponsiveLedgerColumns = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  return useMemo(() => {
    if (isSmallScreen) {
      const smallScreenOverrides = {
        Date: { minWidth: 80, width: 100 },
        Narration: { minWidth: 120, width: "auto" },
        Debit: { minWidth: 50, width: 70 },
        Credit: { minWidth: 50, width: 70 },
        Total: { minWidth: 50, width: 70 },
      };

      return BASE_LEDGER_COLUMNS.map((column) => {
        const override = smallScreenOverrides[column.id];
        return override ? { ...column, ...override } : column;
      });
    }
    return BASE_LEDGER_COLUMNS;
  }, [isSmallScreen]);
};


//================================================================================
// 4. MAIN COMPONENT
//================================================================================

const Ledger = () => {
  // --- STATE MANAGEMENT ---
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [summary, setSummary] = useState({ totalDebit: 0, totalCredit: 0, netBalance: 0 });
  const [balanceInc, setBalanceInc] = useState(true);
  const storageKey = `accountID-/ledger`;
  const [ID, setID] = useLocalStorageState(storageKey, null);
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const ledgerColumns = useResponsiveLedgerColumns();

  const [userData] = useState(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : {};
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return {};
    }
  });

  const isCustomer = userData?.userType?.toLowerCase().includes("customer");

  // --- DATA FETCHING ---
  const handleFetchData = useCallback(async (params) => {
    if (!params || !params.acid) {
      setSearchAttempted(true);
      setRows([]);
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 });
      setCustomerName("");
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
      return;
    }

    const { acid, startDate, endDate, name } = params;
    setLoading(true);
    setError(null);
    setCustomerName(name || "");
    setSearchAttempted(true);
    setRows([]);
    setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 });

    try {
      const response = await axios.get(API_URL, {
        params: { acid, startDate, endDate },
        timeout: 15000,
      });

      if (Array.isArray(response.data)) {
        const sortedData = response.data.sort((a, b) => new Date(a.Date) - new Date(b.Date));

        let balance = 0, totalDebit = 0, totalCredit = 0;
        const processedData = sortedData.map((item) => {
          const debit = Number(item.Debit || 0);
          const credit = Number(item.Credit || 0);
          balance += debit - credit;
          if (item.Narration?.toLowerCase() !== "opening balance") {
            totalDebit += debit;
            totalCredit += credit;
          }
          return { ...item, Total: balance };
        });

        const netBalance = totalDebit - totalCredit;
        const newSummary = { totalDebit, totalCredit, netBalance };

        setBalanceInc(netBalance > 0);
        setSummary(newSummary);
        setRows(processedData);
        localStorage.setItem("ledgerRows", JSON.stringify(processedData));
        localStorage.setItem("ledgerSummary", JSON.stringify(newSummary));
        localStorage.setItem("ledgerSearchAttempted", "true");
      } else {
        throw new Error("Received unexpected data format from server.");
      }
    } catch (fetchError) {
      console.error("Error fetching ledger data:", fetchError);
      let errorMessage = "Failed to fetch ledger data. Please check your network or contact support.";
      if (axios.isCancel(fetchError) || fetchError.code === "ECONNABORTED") {
        errorMessage = "Request timed out. Please try again.";
      } else if (fetchError.response?.data?.message) {
        errorMessage = fetchError.response.data.message;
      }
      setError(errorMessage);
      setRows([]);
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 });
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- EFFECTS ---

  // Effect for non-customer user types
  useEffect(() => {
    if (!isCustomer && userData?.userType) {
      const str = userData.userType;
      const number = parseInt(str.split("-")[1], 10);
      if (!isNaN(number)) {
        const customer = {
          acid: number,
          startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
          endDate: new Date(),
          name: ''
        };
        handleFetchData(customer);
      }
    }
  }, [isCustomer, userData.userType, handleFetchData]);


  // Effect to load data from localStorage on initial mount
  useEffect(() => {
    const savedAttempted = localStorage.getItem("ledgerSearchAttempted") === "true";
    setSearchAttempted(savedAttempted);

    if (savedAttempted) {
      try {
        const savedRows = JSON.parse(localStorage.getItem("ledgerRows") || "[]");
        const savedSummary = JSON.parse(localStorage.getItem("ledgerSummary") || "{}");
        if (Array.isArray(savedRows)) setRows(savedRows);
        if (typeof savedSummary === "object") setSummary(savedSummary);
      } catch (e) {
        console.error("Failed to parse ledger data from localStorage:", e);
        localStorage.removeItem("ledgerRows");
        localStorage.removeItem("ledgerSummary");
      }
    }
  }, []);

  // Effect to trigger fetch based on URL search parameters
  useEffect(() => {
    const acid = searchParams.get("acid");
    if (acid) {
      dispatch(clearSelection({ key: USAGE_KEY }));
      setTimeout(() => dispatch(setIDWithKey({ key: USAGE_KEY, value: acid })), 0);

      const params = {
        acid,
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        name: searchParams.get("name"),
      };
      setID(acid);
      handleFetchData(params);
    }
  }, [searchParams, handleFetchData, dispatch, setID]);

  // --- RENDER ---
  return (
    <Container maxWidth={false} sx={{ py: 2, px: { xs: 0, sm: 1, md: 1 }, width: "100%" }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3, // Replaces Grid spacing
          m: 0,
          width: '100%',
        }}
      >
        {/* Search Form Section */}
        <Box>
          <Card elevation={2}>
            <CardContent>
              <LedgerSearchForm
                usage={USAGE_KEY}
                onFetch={handleFetchData}
                loading={loading}
                name={customerName}
              />
            </CardContent>
          </Card>
        </Box>

        {/* Ledger Content Section */}
        <Box>
          <LedgerMessages
            loading={loading}
            error={error}
            searchAttempted={searchAttempted}
            rowCount={rows.length}
          />
          {!loading && !error && rows.length > 0 && (
            <Box sx={{ width: "100%" }}>
              <LedgerSummary summary={summary} balanceInc={balanceInc} />
              <LedgerTable rows={rows} columns={ledgerColumns} />
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Ledger;