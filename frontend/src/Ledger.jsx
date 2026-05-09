import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Box,
  Card,
  CardContent,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
import { useDispatch } from "react-redux";
import DataTable from "./table";
import LedgerSearchForm from "./CustomerSearch";
import { clearSelection, setIDWithKey } from "./store/slices/CustomerSearch";
import { generateLedgerPdf } from "./utils/ledgerPdfGenerator";
import { generateInvoicePdf } from "./utils/invoicePdfGenerator";

//================================================================================
// 1. UTILITIES & CONSTANTS
//================================================================================

const API_URL   = `${import.meta.env.VITE_API_URL}/ledger`;
const USAGE_KEY      = "ledger";
const UNIQUE_ROW_KEY = "_id";

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const formatDate = (value) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "N/A";
  const day    = String(date.getDate()).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month  = months[date.getMonth()];
  const year   = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

// ── Auth helper ────────────────────────────────────────────────────────────────
const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ── Column definitions ─────────────────────────────────────────────────────────
const BASE_LEDGER_COLUMNS = [
  {
    id: "Date",
    label: "Date",
    align: "center",
    render: (value) => (value ? formatDate(value) : "N/A"),
    width: 80,
    minWidth: 70,
  },
  {
    id: "Doc",
    label: "Doc",
    align: "left",
    render: (value) => (value ? value : "N/A"),
    width: 60,
    minWidth: 50,
  },
  { id: "Narration", label: "Narration", align: "left", width: 350, minWidth: 200 },
  {
    id: "Debit",
    label: "Debit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 90,
    minWidth: 70,
  },
  {
    id: "Credit",
    label: "Credit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 90,
    minWidth: 70,
  },
  {
    id: "Total",
    label: "Balance",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 100,
    minWidth: 80,
  },
  {
    id: "hasImage",
    label: "Image",
    align: "center",
    width: 60,
    render: (value, row) => {
      if (value > 0) {
        return (
          <Button
            size="small"
            variant="contained"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = `/image-viewer?type=${row.Type}&doc=${row.Doc}`;
            }}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "0.75rem",
              fontWeight: "bold",
              px: 2,
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            View
          </Button>
        );
      }
      return null;
    },
  },
];

//================================================================================
// 2. HELPER COMPONENTS
//================================================================================

const LedgerSummary = React.memo(({ summary, onDownloadPdf, generatingPdf }) => {
  const { totalDebit, totalCredit, openingBalance, closingBalance } = summary;
  const increased = closingBalance > openingBalance;

  return (
    <Card elevation={2} sx={{ mb: 3 }}>
      <CardContent>
        <Box
          sx={{
            backgroundColor: "#008080",
            color: "white",
            p: 1,
            mb: 2,
            borderRadius: "4px 4px 0 0",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Account Summary
        </Box>

        <Box
          display="grid"
          justifyItems="center"
          gap={2}
          alignItems="center"
          textAlign="center"
          gridTemplateColumns={{
            xs: "repeat(2, 1fr)",
            sm: increased ? "repeat(5, 1fr)" : "repeat(4, 1fr)",
          }}
        >
          <Typography variant="subtitle1">
            <b>Opening Balance:</b> {formatCurrency(openingBalance)}
          </Typography>
          <Typography variant="subtitle1">
            <b>Total Debit:</b> {formatCurrency(totalDebit)}
          </Typography>
          <Typography variant="subtitle1">
            <b>Total Credit:</b> {formatCurrency(totalCredit)}
          </Typography>
          <Typography
            variant="subtitle1"
            sx={{
              backgroundColor: closingBalance >= 0 ? "#2e7d32" : "#d32f2f",
              p: 1,
              color: "white",
              fontWeight: "bold",
              borderRadius: 1,
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            <b>Closing Balance:</b> {formatCurrency(closingBalance)}
          </Typography>

          {increased && (
            <Typography
              variant="subtitle1"
              sx={{
                backgroundColor: "#d32f2f",
                p: 1,
                color: "white",
                fontWeight: "bold",
                borderRadius: 1,
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              <b>Increased Amount:</b> {formatCurrency(closingBalance - openingBalance)}
            </Typography>
          )}
        </Box>

        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onDownloadPdf}
            disabled={generatingPdf}
            startIcon={
              generatingPdf
                ? <CircularProgress size={20} />
                : <span style={{ fontSize: "1.2rem" }}>📄</span>
            }
            sx={{ borderRadius: "8px", fontWeight: "bold" }}
          >
            {generatingPdf ? "Generating PDF..." : "Download Ledger PDF"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
});

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
        <Typography color="text.secondary">
          Enter customer details and date range to view ledger.
        </Typography>
      </Paper>
    );
  }
  return null;
});

const LedgerTable = React.memo(({ rows, columns, onLongPress, onClick }) => (
  <Card elevation={2} sx={{ width: "100%" }}>
    <Box sx={{ width: "100%", margin: "auto", textAlign: "center" }}>
      <DataTable
        data={rows}
        columns={columns}
        rowKey={UNIQUE_ROW_KEY}
        isLedgerTable={true}
        showPagination={true}
        rowsPerPageOptions={[10, 25, 50, 100]}
        handleLongPress={onLongPress}
        handleClick={onClick}
      />
    </Box>
  </Card>
));

//================================================================================
// 3. CUSTOM HOOKS
//================================================================================

const useResponsiveLedgerColumns = () => {
  const theme         = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  return useMemo(() => {
    if (isSmallScreen) {
      const overrides = {
        Date:      { minWidth: 80,  width: 100 },
        Narration: { minWidth: 120, width: "auto" },
        Debit:     { minWidth: 50,  width: 70 },
        Credit:    { minWidth: 50,  width: 70 },
        Total:     { minWidth: 50,  width: 70 },
      };
      return BASE_LEDGER_COLUMNS.map((col) =>
        overrides[col.id] ? { ...col, ...overrides[col.id] } : col
      );
    }
    return BASE_LEDGER_COLUMNS;
  }, [isSmallScreen]);
};

//================================================================================
// 4. MAIN COMPONENT
//================================================================================

const Ledger = () => {
  // ── State ────────────────────────────────────────────────────────────────────
  const [rows,            setRows]            = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);
  const [customerName,    setCustomerName]    = useState("");
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [summary,         setSummary]         = useState({
    totalDebit: 0, totalCredit: 0, netBalance: 0, closingBalance: 0, openingBalance: 0,
  });
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const storageKey = `accountID-/ledger`;
  const [ID, setID] = useLocalStorageState(storageKey, null);

  const dispatch       = useDispatch();
  const [searchParams] = useSearchParams();
  const ledgerColumns  = useResponsiveLedgerColumns();

  // ── User data (parsed once) ──────────────────────────────────────────────────
  const userData = useMemo(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : {};
    } catch {
      return {};
    }
  }, []);

  const isAdmin    = userData?.userType?.toLowerCase() === "admin";
  const isCustomer = userData?.userType?.toLowerCase().includes("customer");

  // ── Fetch ref (avoids stale closure in event listeners) ──────────────────────
  const fetchRef = useRef(null);

  // ── Core fetch ───────────────────────────────────────────────────────────────
  const handleFetchData = useCallback(async (params) => {
    if (!params?.acid) {
      setSearchAttempted(true);
      setRows([]);
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0, closingBalance: 0, openingBalance: 0 });
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
    setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0, closingBalance: 0, openingBalance: 0 });

    try {
      const response = await axios.get(API_URL, {
        params:  { acid, startDate, endDate },
        headers: getAuthHeaders(),
        timeout: 15000,
      });

      if (!Array.isArray(response.data)) {
        throw new Error("Received unexpected data format from server.");
      }

      const sorted = [...response.data].sort(
        (a, b) => new Date(a.Date) - new Date(b.Date)
      );

      let balance = 0, totalDebit = 0, totalCredit = 0;

      const processed = sorted.map((item) => {
        const debit  = Number(item.Debit  || 0);
        const credit = Number(item.Credit || 0);
        balance += debit - credit;
        if (item.Narration?.toLowerCase() !== "opening balance") {
          totalDebit  += debit;
          totalCredit += credit;
        }
        return { ...item, Total: balance };
      });

      const netBalance     = totalDebit - totalCredit;
      const closingBalance = processed.length > 0 ? processed[processed.length - 1].Total : 0;
      const openingBalance =
        sorted.length > 0 && sorted[0].Narration?.toLowerCase() === "opening balance"
          ? Number(sorted[0].Total || 0)
          : processed.length > 0
          ? processed[0].Total -
            (Number(processed[0].Debit || 0) - Number(processed[0].Credit || 0))
          : 0;

      const newSummary = { totalDebit, totalCredit, netBalance, closingBalance, openingBalance };

      setSummary(newSummary);
      setRows(processed);
      localStorage.setItem("ledgerRows",           JSON.stringify(processed));
      localStorage.setItem("ledgerSummary",         JSON.stringify(newSummary));
      localStorage.setItem("ledgerSearchAttempted", "true");
    } catch (fetchError) {
      console.error("Error fetching ledger data:", fetchError);

      let msg = "Failed to fetch ledger data. Please check your network or contact support.";
      if (fetchError.code === "ECONNABORTED") {
        msg = "Request timed out. Please try again.";
      } else if (fetchError.response?.status === 401) {
        msg = "Session expired. Please log in again.";
      } else if (fetchError.response?.data?.message) {
        msg = fetchError.response.data.message;
      }

      setError(msg);
      setRows([]);
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0, closingBalance: 0, openingBalance: 0 });
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep ref in sync
  useEffect(() => { fetchRef.current = handleFetchData; }, [handleFetchData]);

  // ── Fullscreen + BFCache refresh ─────────────────────────────────────────────
  useEffect(() => {
    const triggerFullscreen = () => {
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const elem = document.documentElement;
      if (isLandscape && !document.fullscreenElement) {
        const req = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
        if (req) req.call(elem).catch(() => {});
      } else if (!isLandscape && document.fullscreenElement) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exit) exit.call(document).catch(() => {});
      }
    };

    const checkRefresh = () => {
      if (localStorage.getItem("ledgerNeedsRefresh") !== "true") return;
      localStorage.removeItem("ledgerNeedsRefresh");
      const urlParams = new URLSearchParams(window.location.search);
      const acid = urlParams.get("acid");
      if (!acid) return;
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
      fetchRef.current?.({
        acid,
        startDate: urlParams.get("startDate"),
        endDate:   urlParams.get("endDate"),
        name:      urlParams.get("name") || customerName,
      });
    };

    const refreshInterval = setInterval(checkRefresh, 500);
    const handleVisibility = () => { if (document.visibilityState === "visible") checkRefresh(); };

    window.addEventListener("pageshow",        checkRefresh);
    window.addEventListener("focus",           checkRefresh);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize",          triggerFullscreen);
    window.addEventListener("click",           triggerFullscreen);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("pageshow",        checkRefresh);
      window.removeEventListener("focus",           checkRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize",          triggerFullscreen);
      window.removeEventListener("click",           triggerFullscreen);
    };
  }, [customerName]);

  // ── Non-customer auto-fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (isCustomer || !userData?.userType) return;
    const number = parseInt(userData.userType.split("-")[1], 10);
    if (!isNaN(number)) {
      handleFetchData({
        acid:      number,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        endDate:   new Date(),
        name:      "",
      });
    }
  }, [isCustomer, userData.userType, handleFetchData]);

  // ── Restore from localStorage on mount (no URL params) ───────────────────────
  useEffect(() => {
    if (searchParams.get("acid")) return; // real search takes priority
    const savedAttempted = localStorage.getItem("ledgerSearchAttempted") === "true";
    setSearchAttempted(savedAttempted);
    if (!savedAttempted) return;
    try {
      const savedRows    = JSON.parse(localStorage.getItem("ledgerRows")    || "[]");
      const savedSummary = JSON.parse(localStorage.getItem("ledgerSummary") || "{}");
      if (Array.isArray(savedRows))         setRows(savedRows);
      if (typeof savedSummary === "object") setSummary(savedSummary);
    } catch {
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
    }
  }, [searchParams]);

  // ── URL param–driven fetch ────────────────────────────────────────────────────
  useEffect(() => {
    const acid = searchParams.get("acid");
    if (!acid) return;

    localStorage.removeItem("ledgerRows");
    localStorage.removeItem("ledgerSummary");
    localStorage.removeItem("ledgerSearchAttempted");

    dispatch(clearSelection({ key: USAGE_KEY }));
    setTimeout(() => dispatch(setIDWithKey({ key: USAGE_KEY, value: acid })), 0);
    setID(acid);

    handleFetchData({
      acid,
      startDate: searchParams.get("startDate"),
      endDate:   searchParams.get("endDate"),
      name:      searchParams.get("name") || customerName,
    });
  }, [searchParams, handleFetchData, dispatch, setID]);

  // ── Long-press → delete transaction (admin only) ─────────────────────────────
  const handleLongPress = useCallback(async (event, doc, row) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `ADMIN ACTION: Are you sure you want to PERMANENTLY DELETE transaction ${row.Type} #${doc} from ALL records (Ledgers, Invoices, and Images)?`
    );
    if (!confirmed) return;

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/ledger/delete-transaction`,
        { type: row.Type, doc },
        { headers: getAuthHeaders() }
      );
      alert("Transaction deleted successfully.");

      const acid = searchParams.get("acid") || ID;
      if (acid) {
        handleFetchData({
          acid,
          startDate: searchParams.get("startDate"),
          endDate:   searchParams.get("endDate"),
          name:      customerName,
        });
      }
    } catch (err) {
      console.error("Deletion failed:", err);
      alert(`Deletion failed: ${err.response?.data?.message || err.message}`);
    }
  }, [isAdmin, handleFetchData, searchParams, ID, customerName]);

  // ── Click → download invoice PDF (SALE rows only) ────────────────────────────
  const handleDownloadInvoicePdf = useCallback(async (doc, row) => {
    if (row?.Type?.toUpperCase() !== "SALE") return;

    // Sanitize doc number — strip commas and decimals
    const cleanDoc = String(doc).replace(/,/g, "").split(".")[0];

    try {
      setGeneratingPdf(true);

      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/invoices/${cleanDoc}`,
        {
          params:  { user: userData?.username, type: userData?.userType },
          headers: getAuthHeaders(),   // ← FIX: auth header was missing
          timeout: 15000,              // ← FIX: add timeout
        }
      );

      const invoiceData = response.data;

      // Guard: must have usable data
      if (!invoiceData?.Customer || !Array.isArray(invoiceData?.Products) || invoiceData.Products.length === 0) {
        alert(`No invoice data found for Doc #${cleanDoc}.`);
        return;
      }

      console.log("DEBUG: Invoice Data Payload", invoiceData);

      const acid   = searchParams.get("acid") || ID;
      const apiUrl = import.meta.env.VITE_API_URL || "";

      await generateInvoicePdf(invoiceData, acid, userData?.userType, apiUrl);
    } catch (err) {
      console.error("Failed to fetch invoice for PDF:", err);

      // Specific error messages per status
      if (err.code === "ERR_NETWORK" || err.code === "ECONNABORTED") {
        alert("Network error — check that the backend is running and you are logged in.");
      } else if (err.response?.status === 401) {
        alert("Session expired. Please log in again.");
      } else if (err.response?.status === 404) {
        alert(`Invoice #${cleanDoc} not found.`);
      } else {
        alert(`Failed to download invoice PDF: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setGeneratingPdf(false);
    }
  }, [userData, searchParams, ID]);

  // ── Ledger PDF download ───────────────────────────────────────────────────────
  const handleDownloadLedgerPdf = useCallback(async () => {
    if (!rows.length) {
      alert("No data available to generate PDF.");
      return;
    }
    setGeneratingPdf(true);
    try {
      const acid     = searchParams.get("acid") || ID;
      const apiUrl   = import.meta.env.VITE_API_URL || "";
      const dateRange = {
        startDate: searchParams.get("startDate"),
        endDate:   searchParams.get("endDate"),
      };
      await generateLedgerPdf(rows, summary, customerName, dateRange, acid, apiUrl);
    } catch (e) {
      console.error("PDF Handler Error:", e);
      alert("Failed to start PDF generation: " + e.message);
    } finally {
      setGeneratingPdf(false);
    }
  }, [rows, summary, customerName, searchParams, ID]);

  //================================================================================
  // 5. RENDER
  //================================================================================
  return (
    <Container
      maxWidth={false}
      sx={{ py: 2, px: { xs: 0, sm: 1, md: 1 }, width: "100%" }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3, m: 0, width: "100%" }}>

        {/* Search Form */}
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

        {/* Content */}
        <Box>
          <LedgerMessages
            loading={loading}
            error={error}
            searchAttempted={searchAttempted}
            rowCount={rows.length}
          />

          {!loading && !error && rows.length > 0 && (
            <Box sx={{ width: "100%" }}>
              <LedgerSummary
                summary={summary}
                generatingPdf={generatingPdf}
                onDownloadPdf={handleDownloadLedgerPdf}
              />
              <LedgerTable
                rows={rows}
                columns={ledgerColumns}
                onLongPress={handleLongPress}
                onClick={handleDownloadInvoicePdf}
              />
            </Box>
          )}
        </Box>

      </Box>
    </Container>
  );
};

export default Ledger;