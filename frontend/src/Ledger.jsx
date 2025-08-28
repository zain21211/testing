import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Box,
  Card,
  CardContent,
  // Divider is imported but not used
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

import { useSearchParams } from "react-router-dom";
import useLocalStorageState from "use-local-storage-state";
// Importing Storage for localStorage management
// import { useLocation } from "react-router-dom"; // Removed unused import
import { useDispatch } from "react-redux";
import DataTable from "./table";
import LedgerSearchForm from "./CustomerSearch";
import {
  clearSelection,
  setIDWithKey
} from "./store/slices/CustomerSearch";

// User specified formatCurrency with 0 decimal places - NOT CHANGING THIS
const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

function formatDate(value) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(0, "0");
  const month = String(date.getMonth() + 1).padStart(0, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}/${month}/${year}`;
}
const url = `${import.meta.env.VITE_API_URL}/ledger`;

// Base column definitions (used for md and larger screens)
// NOTE: ID "Total" vs Label "Balance", fixed/minWidths are kept as per your request for the BASE definition
const baseLedgerColumns = [
  {
    id: "Date", // Kept as "Date" as per user's latest code
    label: "Date",
    align: "center",
    render: (value) => (value ? formatDate(value) : "N/A"),
    width: 100, // Base width
    minWidth: 80, // Base min width
  },
  {
    id: "Doc", // Kept as "Doc"
    label: "Doc",
    align: "left",
    render: (value) => (value ? value : "N/A"),
    width: 80, // Base width
    minWidth: 60, // Base min width
  },
  {
    id: "Narration", // Kept as "Narration"
    label: "Narration",
    align: "left",
    width: 300, // Base width
    minWidth: 150, // Base min width
  },
  {
    id: "Debit", // Kept as "Debit"
    label: "Debit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 120, // Base width
    minWidth: 80, // Base min width
  },
  {
    id: "Credit", // Kept as "Credit"
    label: "Credit",
    align: "right",
    render: (value) => formatCurrency(value),
    width: 120, // Base width
    minWidth: 80, // Base min width
  },
  {
    id: "Total", // Kept as "Total" as per user's latest code
    label: "Balance", // Label is "Balance" but ID is "Total"
    align: "right",
    render: (value) => formatCurrency(value), // Render the calculated running balance (will look for item["Total"])
    width: 120, // Base width
    minWidth: 80, // Base min width
  },
];

const Ledger = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const tableRef = useRef(null); // State to hold the table reference
  const [error, setError] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const storageKey = `accountID-/ledger`; // Unique key based on route
  const [ID, setID] = useLocalStorageState(storageKey, null);  // Use state for ID to allow updates
  const usage = "ledger"
  const dispatch = useDispatch()

  const [balanceInc, setBalanceInc] = useState(true); // State to track if balance is increasing
  // Safely parse userData and provide a default empty object if null or invalid
  const [userData, setUserData] = useState(() => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : {};
    } catch (e) {
      console.error("Failed to parse user from localStorage:", e);
      return {};
    }
  });
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [summary, setSummary] = useState({
    // State to hold the total summary
    totalDebit: 0,
    totalCredit: 0,
    netBalance: 0,
  });

  const isCustomer = userData?.userType?.toLowerCase().includes("customer");

  const [searchParams] = useSearchParams();

  // --- State and logic for responsive table widths ---
  const theme = useTheme();
  // Check if the screen size is down (less than) the 'md' breakpoint
  // The grid layout changes at md, so the table area is wider on md+
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("md"));

  // Dynamically generate the columns array based on screen size
  const ledgerColumns = React.useMemo(() => {
    // If it's a small screen, modify widths
    if (isSmallScreen) {
      // Define overrides for small screens based on your request
      const smallScreenOverrides = {
        // Make Date a bit wider than previous small screen attempt
        Date: { minWidth: 80, width: 100 }, // Matches base, wider than previous small screen override
        // Doc remains as is (no override needed, default switch case handles it)
        // Make Narration wider than previous small screen attempt
        Narration: { minWidth: 120, width: "auto" }, // Increased minWidth, kept auto width
        // Make Debit, Credit, Total narrower than base
        Debit: { minWidth: 50, width: 70 }, // Narrower than base (80/120)
        Credit: { minWidth: 50, width: 70 }, // Narrower than base (80/120)
        Total: { minWidth: 50, width: 70 }, // Narrower than base (80/120) - This is the Balance column
      };

      return baseLedgerColumns.map((column) => {
        const override = smallScreenOverrides[column.id];
        if (override) {
          return {
            ...column,
            ...override, // Apply specific overrides
          };
        }
        // Use base definition for columns not explicitly overridden (like Doc)
        return column;
      });
    }
    // Otherwise (md and larger screens), use the base column definitions
    return baseLedgerColumns;
  }, [isSmallScreen]); // Recalculate columns when isSmallScreen changes
  // --- End responsive table widths logic ---


  useEffect(() => {

    if (!isCustomer) {
      const str = userData?.userType;
      const number = parseInt(str?.split("-")[1], 10);
      console.log(number); // 616
      let id = number;
      const customer = {
        acid: id,
        startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        endDate: new Date(),
        name: ''
      }

      handleFetchData(customer)
    }

  }, [isCustomer])

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedRows = localStorage.getItem("ledgerRows");
    const savedSummary = localStorage.getItem("ledgerSummary");
    const savedAttempted = localStorage.getItem("ledgerSearchAttempted");

    if (savedRows) {
      try {
        const parsedRows = JSON.parse(savedRows);
        // Basic validation: check if it's an array
        if (Array.isArray(parsedRows)) {
          setRows(parsedRows);
        } else {
          console.error("localStorage ledgerRows is not an array.");
          localStorage.removeItem("ledgerRows");
        }
      } catch (e) {
        console.error("Failed to parse ledgerRows from localStorage:", e);
        localStorage.removeItem("ledgerRows"); // Clear invalid data
      }
    }
    if (savedSummary) {
      try {
        const parsedSummary = JSON.parse(savedSummary);
        // Basic validation: check if it's an object with expected keys
        if (
          typeof parsedSummary === "object" &&
          parsedSummary !== null &&
          "totalDebit" in parsedSummary &&
          "totalCredit" in parsedSummary &&
          "netBalance" in parsedSummary
        ) {
          setSummary(parsedSummary);
        } else {
          console.error("localStorage ledgerSummary is not a valid object.");
          localStorage.removeItem("ledgerSummary");
        }
      } catch (e) {
        console.error("Failed to parse ledgerSummary from localStorage:", e);
        localStorage.removeItem("ledgerSummary"); // Clear invalid data
      }
    }
    // Only set searchAttempted to true if it was explicitly saved as "true"
    if (savedAttempted === "true") {
      setSearchAttempted(true);
    } else {
      // If no previous successful search was attempted, clear any potentially stale data
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      // Don't clear searchAttempted here, it defaults to false
    }
  }, []); // This effect runs only once on mount

  const handleFetchData = useCallback(async (params) => {
    // Ensure params is an object and has acid
    if (!params || typeof params !== "object" || !params.acid) {
      //setError("Customer ID parameter is missing."); // Optionally show an error
      setSearchAttempted(true); // A search attempt was made, even if parameters were invalid
      setRows([]); // Clear previous results
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 }); // Reset summary
      setCustomerName(""); // Clear customer name
      // Clear localStorage for invalid search attempts
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
      setLoading(false); // Ensure loading is false if fetch isn't attempted
      return;
    }

    const { acid, startDate, endDate, name } = params;

    console.log(
      `Fetching data for acid: ${acid}, startDate: ${startDate}, endDate: ${endDate}, name: ${name}`
    );
    setLoading(true);
    setError(null);
    setCustomerName(name || "");
    setRows([]); // Clear previous rows immediately
    setSearchAttempted(true); // Mark that a search is being attempted
    setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 }); // Reset summary immediately

    try {
      const response = await axios.get(url, {
        params: { acid, startDate, endDate },
        timeout: 15000, // Add a 15-second timeout for the request
      });

      console.log("responce = ", response)

      if (Array.isArray(response.data)) {
        // Assuming Date key is capitalized based on ledgerColumns ID
        const sortedData = response.data.sort(
          (a, b) => new Date(a.Date) - new Date(b.Date)
        );

        let balance = 0; // Running balance for each row
        let totalDebit = 0; // Accumulator for total debit
        let totalCredit = 0; // Accumulator for total credit

        const processedData = sortedData.map((item) => {
          // Assuming Debit and Credit keys are capitalized based on ledgerColumns ID
          const narration = item.Narration?.toLowerCase() || "";
          const debit = Number(item.Debit || 0);
          const credit = Number(item.Credit || 0);

          balance += debit - credit; // Running balance updates (Credit adds, Debit subtracts)

          // Skip Opening Balance from totals
          if (narration !== "opening balance") {
            totalDebit += debit;
            totalCredit += credit;
          }

          return {
            ...item, // Keep original data
            // IMPORTANT: Add the calculated running balance to a property named "Total"
            // to match the ID used in ledgerColumns, so the render function works.
            // The DataTable component looks up data using column.id
            Total: balance,
            // Keep the lowercase 'balance' if you need it for other reasons, but the table column will use "Total"
            // balance: balance // Optional: keep if needed elsewhere
          };
        });

        // Calculate net balance from accumulated totals
        const netBalance = totalDebit - totalCredit;

        setBalanceInc(netBalance > 0)

        const newSummary = {
          totalDebit,
          totalCredit,
          netBalance,
        };

        setSummary(newSummary); // Set the summary state

        // Save to localStorage for *any* successful fetch, regardless of params source
        localStorage.setItem("ledgerRows", JSON.stringify(processedData));
        localStorage.setItem("ledgerSummary", JSON.stringify(newSummary));
        localStorage.setItem("ledgerSearchAttempted", "true"); // Indicate a search was attempted and successful

        setRows(processedData);
      } else {
        setRows([]); // Clear rows if data format is unexpected
        setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 }); // Reset summary
        setError("Received unexpected data format from server.");
        // Clear localStorage on unexpected data format
        localStorage.removeItem("ledgerRows");
        localStorage.removeItem("ledgerSummary");
        localStorage.removeItem("ledgerSearchAttempted");
      }
    } catch (fetchError) {
      console.error("Error fetching ledger data:", fetchError);
      // Check if it's an Axios timeout error
      if (axios.isCancel(fetchError)) {
        setError("Request timed out.");
      } else if (fetchError.code === "ECONNABORTED") {
        // Specific code for timeout
        setError("Request timed out. Please check your network.");
      } else {
        setError(
          fetchError.response?.data?.message ||
          "Failed to fetch ledger data. Please check your network connection or contact support."
        );
      }


      setRows([]); // Clear rows on error
      setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 }); // Reset summary
      // Clear localStorage on fetch error
      localStorage.removeItem("ledgerRows");
      localStorage.removeItem("ledgerSummary");
      localStorage.removeItem("ledgerSearchAttempted");
    } finally {
      setLoading(false);
      // tableRef.current.focus(); // Ensure loading is turned off regardless of success or error
    }
  }, []); // useCallback dependencies are empty as logic doesn't depend on state/props that change its core function

  // Effect to trigger initial fetch from URL params or handle no initial params
  useEffect(() => {
    // searchParams is always an object, no need to check if it exists
    const acid = searchParams.get("acid");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const name = searchParams.get("name");
    const from = searchParams.get("from");

    // Only attempt fetch if acid is present in URL params
    if (acid) {
      dispatch(clearSelection({ key: usage }));
      setTimeout(() => {
        dispatch(setIDWithKey({ key: usage, value: acid }));
      }, 0);

      const params = {
        acid: acid,
        startDate: startDate,
        endDate: endDate,
        name: name,
        from: from, // Include 'from' if needed for your logic
      };
      setID(acid); // Update ID state with the acid from URL params
      handleFetchData(params);
      console.log(
        `URL params found. Fetching data for acid: ${acid}, startDate: ${startDate}, endDate: ${endDate}, name: ${name}`
      );
    } else {
      // If no URL params, check if a search was previously attempted (from localStorage)
      const previouslyAttempted =
        localStorage.getItem("ledgerSearchAttempted") === "true";

      if (!previouslyAttempted) {
        // If no URL params AND no previous successful search was attempted,
        // ensure state is reset and show the initial prompt message.
        // The first useEffect loaded saved state if it existed, but this
        // handles the case where no params are present AND no saved state exists.
        console.log(
          "No URL params and no previous search attempted. Showing initial prompt."
        );
        setRows([]);
        setSummary({ totalDebit: 0, totalCredit: 0, netBalance: 0 });
        setSearchAttempted(false); // Ensure this is false
        // Clear any potentially stale data if starting fresh
        localStorage.removeItem("ledgerRows");
        localStorage.removeItem("ledgerSummary");
        localStorage.removeItem("ledgerSearchAttempted");
      }
      // If no URL params BUT a previous search was attempted (previouslyAttempted is true),
      // the first useEffect already loaded the saved state, and searchAttempted is true.
      // We do nothing in this 'else' block as the state is already correct.
    }
  }, [searchParams, handleFetchData]); // Dependencies: searchParams changes, handleFetchData needs to be stable

  // Use "_id" as the unique key if it exists in the data
  const uniqueRowKey = "_id"; // Assuming the API returns documents with an _id field

  // Check if userData is valid before accessing properties
  const displayUsername = userData?.username || "N/A";
  const displayUserType = userData?.userType || "N/A";

  // Destructure summary for easier access in JSX
  const { totalDebit, totalCredit, netBalance } = summary;

  return (
    <Container maxWidth={false} sx={{ py: 2, px: { xs: 0, sm: 1, md: 1, }, width: "100%" }}>
      {/* Corrected Grid container and item structure */}
      <Grid container spacing={3} sx={{ m: 0, width: "100%" }}>
        {/* Use spacing and full width */}
        <Grid sx={{ width: "100%" }}>
          {/* Added item prop */}
          <Card elevation={2} sx={{ height: "100%", width: "100%" }}>
            <CardContent>
              <LedgerSearchForm
                usage={"ledger"}
                onFetch={handleFetchData}
                loading={loading}
                name={customerName}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid sx={{ width: "100%" }}>
          {" "}
          {/* Added item prop */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3, borderRadius: 1 }}
              variant="filled"
            >
              {error}
            </Alert>
          )}
          {/* Show loading spinner */}
          {loading && (
            <Paper
              sx={{
                display: "flex",
                justifyContent: "center",
                flexDirection: "column",
                alignItems: "center",
                py: 8,
                borderRadius: 1,
              }}
            >
              <CircularProgress size={40} />
              <Typography sx={{ ml: 2 }}>Loading ledger data...</Typography>
            </Paper>
          )}
          {/* Show data or messages only when not loading */}
          {!loading && rows.length > 0 && (
            <Box
              sx={{
                width: "100%",
              }}>
              {/* Add Card to display the summary */}
              <Card elevation={2} sx={{ mb: 3 }}>
                {" "}
                {/* Added margin-bottom */}
                <CardContent>

                  {/* Added Summary Header */}
                  <Box
                    display="grid"
                    justifyItems="space-between"
                    flexWrap="wrap"
                    gap={2}
                    alignItems="center"
                    textAlign={"center"}
                    gridTemplateColumns={{
                      xs: "repeat(3,2fr)", // Full width on small screens
                      sm: "repeat(3, 1fr)", // Two columns on medium screens
                      md: "repeat(3, 1fr)", // Three columns on large screens
                    }}
                  >
                    {" "}
                    {/* Flexbox for summary items with gap */}
                    <Typography variant="subtitle1">
                      <b>Total Debit:</b> {formatCurrency(totalDebit)}
                    </Typography>
                    <Typography variant="subtitle1">
                      <b>Total Credit:</b> {formatCurrency(totalCredit)}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ backgroundColor: balanceInc ? "red" : "green", p: 1, width: "auto", color: "white", textAlign: "center", fontWeight: "bold", borderRadius: 1 }}>
                      <b>Balance {balanceInc ? "Increase" : "Decrease"}:</b> {formatCurrency(netBalance)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Existing Card for the DataTable */}
              <Card elevation={2} sx={{ width: "100%" }}>
                {/*
                    Removed overflowX: 'auto'.
                    Table width is controlled by the dynamic 'ledgerColumns'.
                  */}
                <Box
                  sx={{
                    width: "100%",
                    margin: "auto",
                    textAlign: "center",
                    // overflowX: 'auto', // REMOVED THIS LINE
                  }}
                >
                  {/*
                    NOTE: Text overflow within cells might still occur and push column widths
                    if text cannot break and exceeds the set width/minWidth.
                    Consider adding CSS like word-break: break-word; to relevant cells
                    if you encounter text overflowing within the columns themselves.
                  */}
                  <Box
                    ref={tableRef}
                  >
                    <DataTable
                      data={rows}
                      // Pass the dynamically generated columns based on screen size
                      columns={ledgerColumns}

                      rowKey={uniqueRowKey} // Make sure DataTable component uses this as React's key prop
                      isLedgerTable={true} // Props for DataTable
                      showPagination={true}
                      rowsPerPageOptions={[10, 25, 50, 100]}
                    />
                  </Box>
                </Box>
              </Card>
            </Box>
          )}
          {/* Show "No records found" only if not loading, no error, a search was attempted, and there are no rows */}
          {!loading && !error && searchAttempted && rows.length === 0 && (
            <Paper
              sx={{
                textAlign: "center",
                py: 8,
                bgcolor: "background.default",
                borderRadius: 1,
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                No records found for the selected criteria.
              </Typography>
            </Paper>
          )}
          {/* Show initial message if not loading, no error, no search attempted yet, and no data */}
          {!loading && !error && !searchAttempted && rows.length === 0 && (
            <Paper
              sx={{
                textAlign: "center",
                py: 8,
                bgcolor: "background.default",
                borderRadius: 1,
              }}
            >
              <Typography sx={{ color: "text.secondary" }}>
                Enter customer details and date range to view ledger.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Ledger;
