import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Paper,
  TextField,
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
import { useDispatch, useSelector } from "react-redux";
import DataTable from "./table"; // Assuming DataTable is in a sibling file
import LedgerSearchForm from "./CustomerSearch"; // Assuming CustomerSearch is in a sibling file
import {
  clearSelection,
  setIDWithKey
} from "./store/slices/CustomerSearch"; // Adjust path as needed
import { fetchMasterCustomerList } from "./store/slices/CustomerData";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { downloadInvoice } from "./services/invoicePdfService";

//================================================================================
// 1. UTILITIES & CONSTANTS
//================================================================================

const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/ledger`;
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
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

const BASE_LEDGER_COLUMNS = [
  { id: "Date", label: "Date", align: "center", render: (value) => (value ? formatDate(value) : "N/A"), width: 100, minWidth: 90 },
  { id: "Doc", label: "Type/Doc", align: "left", render: (value, row) => (row.Type && row.Doc ? `${row.Type} ${row.Doc}` : row.Doc || "N/A"), width: 110, minWidth: 100 },
  { id: "Narration", label: "Narration", align: "left", width: 350, minWidth: 200 },
  { id: "Debit", label: "Debit", align: "right", render: (value) => formatCurrency(value), width: 90, minWidth: 70 },
  { id: "Credit", label: "Credit", align: "right", render: (value) => formatCurrency(value), width: 90, minWidth: 70 },
  { id: "Total", label: "Balance", align: "right", render: (value) => formatCurrency(value), width: 100, minWidth: 80 },
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
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            View
          </Button>
        );
      }
      return null;
    }
  },
];


//================================================================================
// 2. HELPER COMPONENTS (Single Responsibility)
//================================================================================

/**
 * Displays the summary of total debit, credit, and net balance.
 */
/**
 * Displays the summary of total debit, credit, opening and closing balance.
 */
const LedgerSummary = React.memo(({ summary, onDownload, loading, rows }) => {
  const { totalDebit, totalCredit } = summary;
  
  // Extract Opening Balance from first row
  const firstRow = rows[0];
  const openingBalance = firstRow?.Narration?.toLowerCase().includes("opening balance") ? firstRow.Total : 0;
  
  // Closing Balance from last row
  const closingBalance = rows[rows.length - 1]?.Total || 0;
  
  const balanceDifference = closingBalance - openingBalance;
  const isIncreased = balanceDifference > 0;

  return (
    <Card elevation={4} sx={{ 
      mb: 2, 
      borderRadius: '20px',
      background: 'linear-gradient(135deg, #ffffff 0%, #f1f4f8 100%)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.8)'
    }}>
      <CardContent sx={{ p: 1.5 }}>
        {/* Section Heading */}
        <Typography variant="subtitle2" sx={{ fontWeight: '900', color: '#1a237e', textTransform: 'uppercase', mb: 1, ml: 0.5, letterSpacing: '1px' }}>
          Financial Summary
        </Typography>

        {/* Single Unified Summary Element */}
        <Box sx={{ 
          bgcolor: 'rgba(26, 35, 126, 0.04)', 
          borderRadius: '16px', 
          overflow: 'hidden',
          border: '1px solid rgba(26, 35, 126, 0.1)'
        }}>
          {/* Header Row: Total Debits & Opening Balance */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: '800', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Total Debits
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: '900', color: '#d32f2f', fontSize: '1.75rem' }}>
                {formatCurrency(totalDebit)}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" sx={{ fontWeight: '800', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Opening Balance
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: '900', color: '#1a237e', fontSize: '1.75rem' }}>
                {formatCurrency(openingBalance)}
              </Typography>
            </Box>
          </Box>

          {/* Middle Row: Total Credits & Closing Balance */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, borderBottom: isIncreased ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: '800', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Total Credits
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: '900', color: '#2e7d32', fontSize: '1.75rem' }}>
                {formatCurrency(totalCredit)}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" sx={{ fontWeight: '800', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                Closing Balance
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: '900', color: '#1a237e', fontSize: '1.75rem' }}>
                {formatCurrency(closingBalance)}
              </Typography>
            </Box>
          </Box>

          {/* Bottom Row: Net Increase (if applicable) */}
          {isIncreased && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 2, py: 1, bgcolor: 'rgba(211, 47, 47, 0.05)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: '900', color: '#d32f2f', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Increased Balance:
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: '900', color: '#d32f2f', fontSize: '1.75rem' }}>
                {formatCurrency(balanceDifference)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* PDF Download Button - Enhanced Size and Prominence */}
        <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={loading}
            onClick={onDownload}
            startIcon={<PictureAsPdfIcon sx={{ fontSize: '1.5rem !important' }} />}
            fullWidth
            sx={{
              background: 'linear-gradient(45deg, #1a237e 30%, #3949ab 90%)',
              color: 'white',
              py: 2,
              borderRadius: '16px',
              textTransform: 'none',
              fontWeight: '900',
              fontSize: '1.2rem',
              boxShadow: '0 6px 16px rgba(26, 35, 126, 0.25)',
              '&:hover': {
                background: 'linear-gradient(45deg, #3949ab 30%, #5c6bc0 90%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 10px 20px rgba(26, 35, 126, 0.35)',
              }
            }}
          >
            Download Ledger PDF
          </Button>
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
      <Paper sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
        <CircularProgress size={30} />
        <Typography sx={{ ml: 2 }}>Loading ledger data...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" variant="filled" sx={{ mb: 1.5 }}>
        {error}
      </Alert>
    );
  }

  if (searchAttempted && rowCount === 0) {
    return (
      <Paper sx={{ textAlign: "center", py: 4 }}>
        <Typography color="text.secondary">No records found for the selected criteria.</Typography>
      </Paper>
    );
  }

  if (!searchAttempted && rowCount === 0) {
    return (
      <Paper sx={{ textAlign: "center", py: 4 }}>
        <Typography color="text.secondary">Enter customer details and date range to view ledger.</Typography>
      </Paper>
    );
  }

  return null;
});

/**
 * Renders the main data table for the ledger.
 */
const LedgerTable = React.memo(({ rows, columns, onLongPress, onRowClick }) => {
  return (
    <Card elevation={0} sx={{ width: "100%", borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <Box sx={{ width: "100%", margin: "auto", textAlign: "center" }}>
        <DataTable
          data={rows}
          columns={columns}
          rowKey={UNIQUE_ROW_KEY}
          isLedgerTable={true}
          showPagination={true}
          rowsPerPageOptions={[10, 25, 50, 100]}
          handleLongPress={onLongPress}
          onRowClick={onRowClick}
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
  // Track the acid/name of the currently-displayed ledger (never stale)
  const [currentAcid, setCurrentAcid] = useState(null);
  const [currentName, setCurrentName] = useState("");
  const dispatch = useDispatch();
  const masterCustomerList = useSelector((state) => state.customerData?.masterCustomerList || []);
  const [searchParams] = useSearchParams();
  const ledgerColumns = useResponsiveLedgerColumns();
  const location = useLocation();

  const [userData] = useState(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : {};
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return {};
    }
  });

  useEffect(() => {
    if (masterCustomerList.length === 0) {
      dispatch(fetchMasterCustomerList());
    }
  }, [dispatch, masterCustomerList.length]);

  const isCustomer = userData?.userType?.toLowerCase().includes("customer");

  // --- PDF GENERATION ---
  const generatePDF = useCallback(() => {
    if (!rows.length) return;

    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString("en-GB", { 
      day: "2-digit", month: "short", year: "2-digit", 
      hour: "2-digit", minute: "2-digit", second: "2-digit" 
    });
    
    // Use the acid/name from the most recent fetch (never stale localStorage)
    const acid = currentAcid || searchParams.get("acid") || ID || "N/A";
    const nameToUse = currentName || customerName || searchParams.get("name") || "Valued Customer";
    const fileName = `Ledger_${acid}_${nameToUse.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;

    // Extract Balances
    const firstRow = rows[0];
    const openingBalance = firstRow?.Narration?.toLowerCase().includes("opening balance") ? firstRow.Total : 0;
    const closingBalance = rows[rows.length - 1].Total;
    const balanceDifference = closingBalance - openingBalance;
    const isIncreased = balanceDifference > 0;

    // Header - Business Info
    doc.setFontSize(27);
    doc.setTextColor(26, 35, 126); // #1a237e
    doc.setFont("helvetica", "bold");
    doc.text("Ahmad International", 105, 20, { align: "center" });
    
    doc.setFontSize(17);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text("Ledger Statement", 105, 30, { align: "center" });

    // Customer Info Box
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.5);
    doc.line(6, 35, 204, 35);

    doc.setFont("helvetica", "bold");
    doc.text(`Customer:`, 6, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${acid} - ${nameToUse}`, 32, 45);
    
    // Period Calculation
    let startDateStr = searchParams.get("startDate") ? formatDate(searchParams.get("startDate")) : formatDate(rows[0].Date);
    let endDateStr = searchParams.get("endDate") ? formatDate(searchParams.get("endDate")) : formatDate(rows[rows.length - 1].Date);

    doc.setFont("helvetica", "bold");
    doc.text(`Period:`, 6, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${startDateStr} to ${endDateStr}`, 32, 52);
    
    doc.setFont("helvetica", "bold");
    doc.text(`Print Date:`, 140, 45);
    doc.setFont("helvetica", "normal");
    doc.text(`${timestamp}`, 165, 45);

    doc.setFont("helvetica", "bold");
    doc.text(`Printed By:`, 140, 52);
    doc.setFont("helvetica", "normal");
    doc.text(`${userData?.username || "System"}`, 165, 52);

    // Table
    const tableColumn = ["Date", "Document #", "Narration", "Debit", "Credit", "Balance"];
    const tableRows = rows.map(row => [
      formatDate(row.Date),
      row.Type && row.Doc ? `${String(row.Type).toUpperCase()} ${row.Doc}` : row.Doc || "N/A",
      row.Narration || "",
      formatCurrency(row.Debit),
      formatCurrency(row.Credit),
      formatCurrency(row.Total)
    ]);

    autoTable(doc, {
      startY: 60,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: { 
        fillColor: [26, 35, 126], 
        textColor: 255, 
        fontSize: 13,
        halign: 'center',
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 24 },
        1: { halign: 'left', cellWidth: 27 },
        2: { halign: 'left' }, // Narration auto-expands
        3: { halign: 'right', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 25 },
      },
      styles: { fontSize: 11.5, cellPadding: 4, minCellHeight: 14 },
      alternateRowStyles: { fillColor: [245, 248, 255] },
      margin: { top: 60, left: 6, right: 6, bottom: 20 },
      didDrawPage: (data) => {
        // Footer
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Generated on ${timestamp} | Printed by ${userData?.username || "System"} | Page ${data.pageNumber}`, 105, 285, { align: "center" });
      }
    });

    // Totalling Section
    const summaryBoxHeight = isIncreased ? 65 : 53;
    const pageHeight = doc.internal.pageSize.getHeight();
    let finalY = doc.lastAutoTable.finalY + 10;
    // If summary won't fit on current page, push to a new page
    if (finalY + summaryBoxHeight > pageHeight - 18) {
      doc.addPage();
      finalY = 20;
    }
    const summaryWidth = 85;
    const startX = 204 - summaryWidth;

    // Background for summary
    doc.setFillColor(248, 249, 250);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, summaryBoxHeight, 'F');
    doc.setDrawColor(200);
    doc.rect(startX - 5, finalY - 5, summaryWidth + 10, summaryBoxHeight, 'S');

    doc.setFontSize(14);
    doc.setTextColor(26, 35, 126);
    doc.setFont("helvetica", "bold");
    doc.text("SUMMARY STATEMENT", startX, finalY + 5);
    
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.3);
    doc.line(startX, finalY + 7, startX + summaryWidth, finalY + 7);

    const drawSummaryRow = (label, value, y, color = [0, 0, 0], isBold = false) => {
      doc.setFontSize(13);
      doc.setTextColor(100);
      doc.setFont("helvetica", "normal");
      doc.text(label, startX, y);
      
      doc.setTextColor(color[0], color[1], color[2]);
      if (isBold) doc.setFont("helvetica", "bold");
      doc.text(formatCurrency(value), startX + summaryWidth, y, { align: "right" });
    };

    drawSummaryRow("Opening Balance:", openingBalance, finalY + 15);
    drawSummaryRow("Total Debits:", summary.totalDebit, finalY + 23, [211, 47, 47]); // Changed to RED
    drawSummaryRow("Total Credits:", summary.totalCredit, finalY + 31, [46, 125, 50]); // Changed to GREEN
    
    // Closing Balance
    doc.setFontSize(14);
    drawSummaryRow("Closing Balance:", closingBalance, finalY + 41, [26, 35, 126], true);

    if (isIncreased) {
        doc.setFillColor(255, 235, 235);
        doc.rect(startX, finalY + 45, summaryWidth, 9, 'F'); // Increased height to 9
        doc.setTextColor(211, 47, 47);
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("Increased Balance:", startX + 2, finalY + 51);
        doc.text(formatCurrency(balanceDifference), startX + summaryWidth - 2, finalY + 51, { align: "right" });
    }

    // Save and auto-open in new tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    doc.save(fileName);
    window.open(blobUrl, '_blank');
    // Revoke after a short delay to free memory
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
  }, [rows, summary, customerName, currentAcid, currentName, searchParams, ID, userData]);

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
    setID(acid); // Persist for legacy fallback
    setCurrentAcid(String(acid)); // Always track the real acid for PDF
    setCurrentName(name || "");   // Always track the real name for PDF
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

  const fetchRef = React.useRef(handleFetchData);
  useEffect(() => {
    fetchRef.current = handleFetchData;
  }, [handleFetchData]);

  // --- FULLSCREEN & REFRESH LOGIC ---
  useEffect(() => {
    const triggerFullscreen = () => {
      const isLandscape = window.matchMedia("(orientation: landscape)").matches;
      const elem = document.documentElement;

      if (isLandscape && !document.fullscreenElement) {
        const requestFS = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
        if (requestFS) {
          requestFS.call(elem).catch(() => {});
        }
      } else if (!isLandscape && document.fullscreenElement) {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
        if (exitFS) exitFS.call(document).catch(() => {});
      }
    };

    // Unbreakable Auto-Refresh Logic (Bypasses BFCache entirely)
    const checkRefresh = () => {
      if (localStorage.getItem("ledgerNeedsRefresh") === "true") {
        localStorage.removeItem("ledgerNeedsRefresh"); // Clear flag immediately
        const urlParams = new URLSearchParams(window.location.search);
        const acid = urlParams.get("acid");
        if (acid) {
          localStorage.removeItem("ledgerRows");
          localStorage.removeItem("ledgerSummary");
          localStorage.removeItem("ledgerSearchAttempted");

          const params = {
            acid,
            startDate: urlParams.get("startDate"),
            endDate: urlParams.get("endDate"),
            name: urlParams.get("name") || customerName,
          };
          
          if (fetchRef.current) {
            fetchRef.current(params);
          }
        }
      }
    };

    // Poll every 500ms: Even if the page is completely frozen by Safari BFCache, 
    // the interval will fire almost immediately upon resume.
    const refreshInterval = setInterval(checkRefresh, 500);

    // Fallbacks
    window.addEventListener("pageshow", checkRefresh);
    window.addEventListener("focus", checkRefresh);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkRefresh();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", triggerFullscreen);
    window.addEventListener("click", triggerFullscreen);
    
    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener("pageshow", checkRefresh);
      window.removeEventListener("focus", checkRefresh);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", triggerFullscreen);
      window.removeEventListener("click", triggerFullscreen);
    };
  }, [customerName]);



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


  // Effect to load data from localStorage on initial mount (only if no search params)
  useEffect(() => {
    const acidInUrl = searchParams.get("acid");
    if (acidInUrl) return; // Skip cache loading if we are performing a real search

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
  }, [searchParams]);

  // Effect to trigger fetch based on URL search parameters
  useEffect(() => {
    const acid = searchParams.get("acid");
    if (acid) {
      // CLEAR CACHE IMMEDIATELY
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
      
      const params = {
        acid,
        startDate: searchParams.get("startDate"),
        endDate: searchParams.get("endDate"),
        name: searchParams.get("name") || customerName,
      };

      // Ensure the search component state is synced
      dispatch(clearSelection({ key: USAGE_KEY }));
      setTimeout(() => dispatch(setIDWithKey({ key: USAGE_KEY, value: acid })), 0);
      setID(acid);
      
      // TRIGGER FRESH FETCH
      handleFetchData(params);
    }
  }, [searchParams, handleFetchData, dispatch, setID]); 

  const handleLongPress = useCallback(async (doc, type) => {
    const isAdmin = userData?.userType?.toLowerCase() === "admin";
    if (!isAdmin) return;

    if (window.confirm(`ADMIN ACTION: Are you sure you want to PERMANENTLY DELETE transaction ${type} #${doc} from ALL records (Ledgers, Invoices, and Images)?`)) {
      try {
        const token = localStorage.getItem("authToken");
        await axios.post(`${import.meta.env.VITE_API_URL}/ledger/delete-transaction`, 
          { type, doc },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Transaction deleted successfully.");
        // Re-fetch data using existing params stored in searchParams or ID
        const acid = searchParams.get("acid") || ID;
        if (acid) {
           handleFetchData({
             acid,
             startDate: searchParams.get("startDate"),
             endDate: searchParams.get("endDate"),
             name: customerName
           });
        }
      } catch (err) {
        console.error("Deletion failed:", err);
        alert(`Deletion failed: ${err.response?.data?.message || err.message}`);
      }
    }
  }, [userData, handleFetchData, searchParams, ID, customerName]);

  const handleSaleDownload = useCallback(async (row) => {
    const docNum = row.Doc || row.doc;
    if (!docNum) {
      alert("Invalid Document Number.\nPls try again.");
      return;
    }
    
    // Use the acid/name from the most recent fetch (never stale localStorage)
    const acid = currentAcid || searchParams.get("acid") || ID;
    const nameToUse = currentName || customerName || searchParams.get("name") || "Valued_Customer";
    
    if (!acid || acid === "N/A") {
      alert("failed to download invoice pdf\npls try again\nverify all required values before generating invoice pdf");
      return;
    }

    setLoading(true);
    try {
      await downloadInvoice({
        docNum,
        acid,
        name: nameToUse,
        userData
      });
    } catch (err) {
      alert(`Failed to download invoice pdf. ${err.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  }, [currentAcid, currentName, ID, customerName, searchParams, userData]);

  return (
    <Container maxWidth={false} sx={{ py: 1, px: { xs: 1, sm: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: '100vh', width: '100%' }}>
      <Box sx={{ mb: 1, px: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#1a237e', mb: 0, letterSpacing: '-0.5px' }}>
          Customer Ledger
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
          Manage and review customer accounts with real-time tracking.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1, 
          m: 0,
          width: '100%',
        }}
      >
        {/* Search Form Section */}
        <Box>
          <Card elevation={0} sx={{ borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <CardContent sx={{ p: 1.5 }}>
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
              <LedgerSummary 
                summary={summary} 
                onDownload={generatePDF} 
                loading={loading}
                rows={rows}
              />
              <LedgerTable 
                rows={rows} 
                columns={ledgerColumns} 
                onLongPress={(doc, row) => handleLongPress(doc, row.Type)} 
                onRowClick={handleSaleDownload}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Ledger;