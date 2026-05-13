import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { useNavigate, useNavigation, useSearchParams } from "react-router-dom";
import axios from "axios";
import localforage from "localforage";
import { backgroundSyncService } from "./services/backgroundSyncService";
import LocalPendingItems from "./components/orderform/LocalPendingItems.jsx";
import OrderEntriesList from "./components/orderform/OrderEntriesList.jsx";
import { downloadInvoice } from "./services/invoicePdfService";
// import debounce from "lodash.debounce";
import { v4 as uuidv4 } from "uuid";

// --- Material-UI Imports ---
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  List,
  Collapse,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Paper,
  CircularProgress,
  FormControl,
  Tabs,
  Tab,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import Fade from "@mui/material/Fade";
import CloseIcon from "@mui/icons-material/Close";

// --- Custom Hooks & Components ---
import { useLocalStorageState } from "./hooks/LocalStorage";
import { useIndexedDBState } from "./hooks/indexDBHook";
// import useGeolocation from "./hooks/geolocation";
import InactiveItems from "./components/InactiveItems.jsx";
import LedgerSearchForm from "./CustomerSearch.jsx";
import ProductSelectionForm from "./ProductSelectionForm.jsx";
import {
  setIDWithKey,
  setSelectedCustomer,
  clearSelection,
} from "./store/slices/CustomerSearch";
// import AttachMoneyIcon from "@mui/icons-material/AttachMoney"; // Not used in this version
import { useDispatch } from "react-redux";
import { useInvoiceSync } from "./hooks/useInvoiceSync.js";

// --- Constants & Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_URL;
const spoList = ["ARIF", "SALMAN", "ZAIN", "HAMZA", "SANAULHAQ"];
const postButtons = [
  { text: "INVOICE", color: "green" },
  { text: "ESTIMATE", color: "error" },
];

// --- Utility Functions ---
const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// function escapeRegExp(string) {
//   return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

// function makeWildcardRegex(filter) {
//   if (!filter || filter.trim() === "") return null;
//   const lowerFilter = filter.toLowerCase().trim();
//   const terms = lowerFilter.split(/[%\s]+/).map(escapeRegExp);
//   const pattern = `^${terms[0]}.*${terms.slice(1).join(".*")}`;
//   try {
//     return new RegExp(pattern, "i");
//   } catch (e) {
//     console.error("Invalid regex:", pattern, e);
//     return null;
//   }
// }

// --- Styled Components ---
const BigTextField = styled(TextField)({
  "& .MuiInputBase-root": {
    fontSize: "1.4rem",
    width: "auto",
    minWidth: "150px",
  },
  "& .MuiInputBase-input": {
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: "1.5px",
  },
  "& label": {
    fontSize: "1rem",
    fontWeight: "bold",
  },
  "& label.Mui-focused": {
    fontSize: "1.1rem",
    fontWeight: "bold",
  },
  "& .MuiInputLabel-root": {
    transformOrigin: "top left",
  },
});

const OrderForm = () => {
  // const navigate = useNavigation();
  // --- Redux State ---
  const { selectedCustomer } = useSelector(
    (state) => state.customerSearch.customers["orderForm"],
  );
  const dispatch = useDispatch();
  // --- Component State ---
  const [products, setProducts, productsLoaded] = useIndexedDBState(
    "products",
    [],
  );
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [token] = useState(localStorage.getItem("authToken"));
  const [overDue, setOverDue] = useState(null);
  const [balance, setBalance] = useState(null);
  const [open, setOpen] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const [searchParams] = useSearchParams();
  const [spo, setSpo] = useState(user?.username);
  // const [spo, setSpo] = useLocalStorageState('SpoOrderform', user?.username);
  const acid = searchParams.get("acid");
  const [localItems, setLocalItems] = useState([]);
  // --- Refs ---
  const customerInputRef = useRef(null);

  // --- Local Storage State ---
  const [invoice, setInvoice] = useLocalStorageState("invoice", []);
  const [dailyOrders, setDailyOrders] = useIndexedDBState("dailyOrders", []);
  
  const myDailyOrders = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return dailyOrders.filter(o => 
      o.username === user?.username && 
      o.orderDate?.split('T')[0] === todayStr
    );
  }, [dailyOrders, user]);

  const [orderItems, setOrderItems] = useLocalStorageState(
    "orderFormOrderItems",
    [],
  );
  const [orderItemsTotalQuantity, setOrderItemsTotalQuantity] =
    useLocalStorageState("orderFormTotalQuantity", 0);
  const [selectedDate, setSelectedDate] = useLocalStorageState(
    "orderFormSelectedDate",
    new Date().toISOString().split("T")[0], // Store as YYYY-MM-DD
  );

  // --- Derived State & Memoized Values ---
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const d = new Date(today);
    return d.toISOString().split("T")[0];
  }, [today]);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, [today]);

  // custom hooks
  const { retryInvoices, clearInvoices, loading: syncing } = useInvoiceSync(
    invoice,
    setInvoice,
    token
  );
  // --- Effects ---

  useEffect(() => {
    console.log("Syncing invoices:", acid);
    dispatch(setIDWithKey({ key: "orderForm", value: parseInt(acid) }));
    // dispatch(setIDInputWithKey({ key: 'orderForm', value: parseInt(acid) }))
  }, [acid, dispatch]);

  // Ensure selected date is not in the past on initial load
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate < todayStr) {
      setSelectedDate(todayStr);
    }
  }, []); // Runs only on mount

  // --- Data Loading Effects ---

  // 1. Sync companies and categories whenever products load or change
  useEffect(() => {
    if (productsLoaded && products.length > 0) {
      const uniqueCompanies = [...new Set(products.map((p) => p.Company).filter(Boolean))].sort();
      const uniqueCategories = [...new Set(products.map((p) => p.Category).filter(Boolean))].sort();
      
      // Only update if they are currently empty to avoid unnecessary re-renders
      setCompanies(uniqueCompanies);
      setCategories(uniqueCategories);
      
      if (!navigator.onLine) {
        setInitialDataLoading(false);
      }
    }
  }, [products, productsLoaded]);

  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setInitialDataLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      //setInitialDataLoading(true);
      setError(null);

      // If offline, use cached products already loaded by useIndexedDBState
      if (!navigator.onLine) {
        if (products.length > 0) {
          setCompanies([...new Set(products.map((p) => p.Company).filter(Boolean))].sort());
          setCategories([...new Set(products.map((p) => p.Category).filter(Boolean))].sort());
        }
        setInitialDataLoading(false);
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        console.log(products)
        const prodResponse = await axios.get(`${API_BASE_URL}/products`, {
          headers,
          timeout: 5000,
        });
        console.log(prodResponse.data)
        const allProducts = prodResponse.data || products;

        const cleanedProducts = allProducts
          .map((p) => ({
            ...p,
            Name: p.Name ? String(p.Name).trim() : "",
            Company: p.Company ? String(p.Company).trim() : "",
            Category: p.Category ? String(p.Category).trim() : "",
            SaleRate: p.SaleRate ?? 0,
            ID: p.ID,
            code: p.code,
            StockQty: p.StockQty ?? 0,
          }))
          .filter((p) => p.ID != null && p.Name && p.Name.trim() !== "");
        if (cleanedProducts.length !== 0)
          setProducts(cleanedProducts);
      } catch (err) {
        // If request fails (tunnel/server down), silently use cached products
        console.warn("Product fetch failed, using cached products:", err.message);
        if (err.response?.status === 401 || err.response?.status === 403) {
           setError("Session expired or unauthorized. Some features may be limited. Please log in again when online.");
        } else if (products.length === 0) {
           setError("Could not load products. Please check your connection or try again later.");
        }
      } finally {
        setInitialDataLoading(false);
      }
    };

    if (productsLoaded) {
      setCompanies(
        [...new Set(products.map((p) => p.Company).filter(Boolean))].sort(),
      );
      setCategories(
        [...new Set(products.map((p) => p.Category).filter(Boolean))].sort(),
      );
      fetchInitialData();
    }
  }, [token, productsLoaded, setProducts]);

  // Fetch customer balance and overdue amount
  useEffect(() => {
    const fetchCustomerFinancials = async () => {
      if (!selectedCustomer?.acid) {
        setBalance(null);
        setOverDue(null);
        return;
      }

      if (!navigator.onLine) {
        setBalance("Offline");
        setOverDue("Offline");
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const params = { acid: selectedCustomer.acid, date: selectedDate };

        const [balRes, overDueRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/balance`, { params, headers, timeout: 5000 }),
          axios.get(`${API_BASE_URL}/balance/overdue`, { params, headers, timeout: 5000 }),
        ]);

        setBalance(formatCurrency(Math.round(balRes.data.balance)));
        setOverDue(formatCurrency(Math.round(overDueRes.data.overDue)));
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        console.error("Error fetching customer financials:", errorMessage);
        // setError(`Failed to load customer financials. ${errorMessage}`);
        setBalance(null);
        setOverDue(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerFinancials();
  }, [selectedCustomer, selectedDate, token]);

  // Recalculate total quantity whenever order items change
  useEffect(() => {
    const newTotalQuantity = orderItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0,
    );
    setOrderItemsTotalQuantity(newTotalQuantity);
  }, [orderItems, setOrderItemsTotalQuantity]);

  // --- Event Handlers & Callbacks ---

  const HandleShortcuts = (event) => {
    // POST ESTIMATE
    if (event.altKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      handlePostOrder("ESTIMATE");
    }

    // POST INVOICE
    if (event.altKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      // handlePostOrder("INVOICE");
      getInvoicePreview('INVOCIE')
    }
  };

  const getInvoicePreview = async () => {
    try {
      await handlePostOrder("INVOICE");
      // PDF is auto-opened by downloadInvoice; no page navigation needed.
      // Focus returns to customer input via clearFormState.
    } catch (error) {
      console.error(error);
    }
  };
  const handleSelectCustomer = useCallback((customer) => {
    setSelectedCustomer(customer);
    if (customer) {
      customerInputRef.current?.focus();
    }
  }, []);

  const handleLedgerClick = useCallback(() => {
    if (!selectedCustomer?.acid) {
      setError("Please select a customer to view the ledger.");
      return;
    }
    const endDateObj = new Date(selectedDate);
    const startDateObj = new Date(selectedDate);
    startDateObj.setMonth(startDateObj.getMonth() - 3);
    const ledgerStartDate = startDateObj.toISOString().split("T")[0];
    const ledgerEndDate = endDateObj.toISOString().split("T")[0];

    const url = `/ledger?name=${encodeURIComponent(
      selectedCustomer.name || "",
    )}&acid=${encodeURIComponent(
      selectedCustomer.acid,
    )}&startDate=${encodeURIComponent(
      ledgerStartDate,
    )}&endDate=${encodeURIComponent(ledgerEndDate)}`;

    navigate(url, { state: { orderForm: true } });
  }, [selectedCustomer, selectedDate, navigate]);

  // Resets the state associated with the product input form
  const resetProductInputs = useCallback(() => {
    // This function can be expanded if ProductSelectionForm exposes a reset method via a ref
    // For now, it clears what it can from the parent.
  }, []);

  const handleChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAddProduct = useCallback(
    (item) => {
      if (!item) {
        setError("No item provided to add.");
        return;
      }
      item.customerID = selectedCustomer?.acid;

      setOrderItems((prev) => [...prev, item]);
      resetProductInputs();
    },
    [selectedCustomer, setOrderItems, resetProductInputs],
  );

  const handleRemoveProduct = useCallback(
    (indexToRemove) => {
      setOrderItems((prev) => prev.filter((_, i) => i !== indexToRemove));
    },
    [setOrderItems],
  );

  const handlePostOrder = async (status) => {
    setError(null);
    setSuccess(null);

    if (!selectedCustomer?.acid) {
      setError("Please select a customer before posting the order.");
      return;
    }
    if (orderItems.length === 0) {
      setError("Cannot post an empty order. Please add at least one product.");
      return;
    }

    setLoading(true);

    const transId = uuidv4();
    const payload = {
      products: orderItems.map((item) => ({
        date: selectedDate,
        acid: String(selectedCustomer.acid),
        type: "SALE",
        qty: Number(item.orderQuantity),
        aQty: Number(item.quantity),
        bQty: Number(item.orderQuantity),
        rate: Number(item.rate),
        suggestedPrice: Number(item.suggestedPrice),
        vest: Number(item.vest),
        discP1: Number(item.discount1),
        discP2: Number(item.discount2),
        vist: Math.round(item.amount),
        SchPc: Number(item.schPc) || 0,
        sch: Boolean(item.Sch),
        isClaim: Boolean(item.isClaim),
        prid: String(item.productID) || "0",
        profit: item.profit,
        remakes: item.remakes || "",
        spo: String(spo || user?.username || "no user"),
      })),
      orderDate: selectedDate,
      customerAcid: String(selectedCustomer.acid),
      customerName: selectedCustomer.name,
      UrduName: selectedCustomer.UrduName,
      route: selectedCustomer.route || "",
      rno: selectedCustomer.rno || "",
      userId: user?.UserID,
      username: user?.username || "unknown",
      userType: user?.UserLevel || "STAFF",
      salesRevenueAcid: 4,
      transactionID: transId,
      totalAmount: orderItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      ),
      totalQuantity: Number(orderItemsTotalQuantity),
      status: status || "ESTIMATE",
    };

    const clearFormState = () => {
      setOrderItems([]);
      setSelectedCustomer(null);
      resetProductInputs();
      setBalance(null);
      setOverDue(null);
      dispatch(clearSelection({ key: "orderForm" }));
      // Return focus to the customer search box for the next order
      setTimeout(() => customerInputRef.current?.focus(), 100);
    };

    // --- REAL-TIME POST ATTEMPT (if online) ---
    if (navigator.onLine) {
      try {
        console.log("Attempting real-time post...");
        const response = await axios.post(
          `${API_BASE_URL}/create-order`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000 // Short timeout for field work
          },
        );

        if (response.status === 200 || response.status === 201 || response.status === 204) {
          const doc = response.data.doc;
          const newDailyOrder = { ...payload, synced: true, doc };

          // Save to daily history
          const currentDailyOrders = await localforage.getItem("dailyOrders") || [];
          await localforage.setItem("dailyOrders", [...currentDailyOrders, newDailyOrder]);
          setDailyOrders(prev => [...prev, newDailyOrder]);

          setSuccess(`Order posted successfully! Doc: ${doc} ✅`);
          
          // --- AUTOMATIC PDF DOWNLOAD ---
          try {
            await downloadInvoice({
              docNum: doc,
              acid: payload.customerAcid,
              name: payload.customerName,
              userData: user
            });
          } catch (pdfErr) {
            console.error("Auto PDF download failed:", pdfErr);
            // Non-blocking error
          }

          clearFormState();
          setLoading(false);

          // Trigger background sync to process any older pending orders
          backgroundSyncService.syncInvoices().catch(console.error);

          return doc;
        }
      } catch (err) {
        console.warn("Real-time post failed or timed out, falling back to offline queue:", err.message);
      }
    }

    // --- OFFLINE FALLBACK (or failed online attempt) ---
    const newDailyOrder = { ...payload, synced: false };
    
    // 1. Save to local daily history
    const currentDailyOrders = await localforage.getItem("dailyOrders") || [];
    await localforage.setItem("dailyOrders", [...currentDailyOrders, newDailyOrder]);
    setDailyOrders(prev => [...prev, newDailyOrder]);
    
    // 2. Add to sync queue
    const currentInvoices = JSON.parse(localStorage.getItem("invoice") || "[]");
    const updatedInvoices = [...currentInvoices, payload];
    localStorage.setItem("invoice", JSON.stringify(updatedInvoices));
    setInvoice(updatedInvoices);
    
    setSuccess("Network unstable. Order saved locally and will sync in background. ✅");
    clearFormState();

    // Trigger background sync (non-blocking)
    backgroundSyncService.syncInvoices().catch(console.error);

    setLoading(false);
    return null;
  };

  const handlePendingItems = async (company = "fit") => {
    console.log("Fetching pending items for company:", company);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/create-order/pendingitems`,
        {
          params: { acid: selectedCustomer?.acid },
        },
      );

      const pendingItems = response.data;
      const transformedItems = pendingItems.map((item) => ({
        productID: item.productID,
        customerID: item.customerID,
        name: item.Name,
        company: item.Company,
        model: item.model,
        orderQuantity: Number(item.orderQuantity),
        schPc: Number(item.schPc) || 0,
        quantity: Number(item.TotalQty) || 0,
        rate: Number(item.SaleRate) || 0,
        suggestedPrice: Number(item.SaleRate) || 0,
        vest: 0,
        discount1: Number(item.DiscP) || 0,
        discount2: Number(item.DiscP2) || 0,
        amount: Number(item.Amount) || 0,
        isClaim: item.isClaim,
        Sch: item.Sch,
        profit: Number(item.Profit) || 0,
        remakes: "",
      }));

      // if (company === "fit")
      setOrderItems((prev) => [...prev, ...transformedItems]);
      // if (company === "local") setLocalItems(transformedItems);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Could not fetch pending items.";
      setError(errorMessage);
    }
  };

  const handleSyncOneOrder = async (order) => {
    if (!navigator.onLine) {
        setError("Still offline. Please check your internet connection.");
        return;
    }

    setLoading(true);
    try {
        const response = await backgroundSyncService.syncOneInvoice(order.transactionID);
        setSuccess("Order synchronized successfully! ✅");
        
        // --- AUTOMATIC PDF DOWNLOAD AFTER SYNC ---
        if (response && response.doc) {
            try {
                await downloadInvoice({
                    docNum: response.doc,
                    acid: order.customerAcid,
                    name: order.customerName,
                    userData: user
                });
            } catch (pdfErr) {
                console.error("Post-sync PDF download failed:", pdfErr);
            }
        }
    } catch (e) {
        console.error("Manual sync failed:", e);
        const detailMsg = e.response?.data?.details || e.message;
        setError(`Failed to sync: ${detailMsg}`);
    } finally {
        setLoading(false);
        // After manual sync, check if there are others to sync
        backgroundSyncService.syncInvoices().catch(console.error);
    }
  };

  const totalAmount = useMemo(
    () => orderItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [orderItems],
  );

  return (
    <Container
      tabIndex={0} // makes it focusable
      onKeyDown={HandleShortcuts}
      maxWidth="lg"
    // sx={{ outline: "none" }} // prevent blue border
    >
      {(success || error) && (
        <Box>
          <Fade in={!!error}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Fade>
          <Fade in={!!success}>
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          </Fade>
        </Box>
      )}

      <Box
        sx={{
          mb: 1,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ gridColumn: { xs: "span 2", sm: "span 4" } }}>
          <LedgerSearchForm
            usage="orderForm"
            onSelect={handleSelectCustomer}
            name={selectedCustomer?.name || ""}
            loading={loading || initialDataLoading}
            inputRef={customerInputRef}
            disabled={orderItems.length > 0 && selectedCustomer}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridColumn: "span 4",
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            gap: 2,
            alignItems: "center",
            // height: { xs: "auto", md: "77px" },
          }}
        >
          <TextField
            fullWidth
            type="date"
            label="Select Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: minDate, max: maxDate }}
          />

          {selectedCustomer && (
            <Button
              onClick={handleLedgerClick}
              variant="contained"
              color="primary"
              fullWidth
              sx={{
                fontSize: "1.6rem",
                transition: "background-color 0.3s",
                "&:hover": { backgroundColor: "primary.dark" },
              }}
            >
              LEDGER
            </Button>
          )}

          {balance !== null && (
            <BigTextField
              label="BALANCE"
              value={balance}
              disabled
              InputLabelProps={{ shrink: true }}
              sx={{
                width: "100%",
                "& .Mui-disabled": {
                  fontWeight: "bold",
                  textAlign: "right",
                  WebkitTextFillColor: "black !important",
                },
              }}
            />
          )}

          {parseFloat(overDue) > 0 && overDue !== null && (
            <BigTextField
              label="OVERDUE"
              value={overDue}
              disabled
              InputLabelProps={{
                shrink: true,
                sx: {
                  color: "black !important",
                  fontWeight: "bold !important",
                  backgroundColor: "white !important",
                  paddingX: 1,
                  borderRadius: "4px",
                  fontSize: "1rem",
                },
              }}
              InputProps={{
                sx: {
                  "& input.Mui-disabled": {
                    WebkitTextFillColor: "white",
                    textAlign: "right",
                  },
                },
              }}
              sx={{
                width: "100%",
                "& .MuiOutlinedInput-root": {
                  backgroundColor: "red",
                  "& fieldset": { borderColor: "red" },
                  "&:hover fieldset": { borderColor: "red" },
                  "&.Mui-focused fieldset": { borderColor: "red" },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {selectedCustomer && (
        <Box>
          <Button
            variant="contained"
            onClick={() => setOpen((prev) => !prev)}
            sx={{ mb: 2 }}
          >
            {open ? "Hide Order History" : "Show Order History"}
          </Button>
          <Collapse in={open}>
            <Box
              sx={{
                backgroundColor: "grey.300",
                color: "black",
                p: 1,
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  fontWeight: "bold",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Tabs value={activeTab} onChange={handleChange}>
                  <Tab
                    label="focus"
                    sx={{ fontWeight: "bold", fontSize: "1rem" }}
                  />
                  <Tab
                    label="fit"
                    sx={{ fontWeight: "bold", fontSize: "1rem" }}
                  />
                </Tabs>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "Jameel Noori Nastaleeq, serif",
                    textAlign: "right",
                    fontSize: "3rem",
                    fontWeight: "bold",
                    px: 1,
                  }}
                >
                  : آئٹم آرڈر کی آخری تاریخ
                </Typography>
              </Box>
              {/* Tabs content */}
              {activeTab === 0 && (
                <InactiveItems
                  acid={selectedCustomer.acid}
                  handleRowClick={() => { }}
                  company={"st%"}
                />
              )}
              {activeTab === 1 && (
                <InactiveItems
                  acid={selectedCustomer.acid}
                  handleRowClick={() => { }}
                />
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      <Paper
        sx={{ p: 2, mb: 3, opacity: loading || initialDataLoading ? 0.7 : 1 }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            gap: 2,
            alignItems: "center",
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ fontFamily: "'Poppins', sans-serif" }}
          >
            Add Product
          </Typography>

          <FormControl
            fullWidth
            sx={{
              flex: 1,
              display: {
                xs: "none",
                md: "block",
              },
            }}
          >
            <InputLabel id="shop-label">Spo</InputLabel>
            <Select
              labelId="customer-label"
              id="customer"
              value={spo}
              defaultValue={user?.username || "no user"}
              label="Customer"
              onChange={(e) => setSpo(e.target.value)}
            >
              {spoList.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedCustomer && (
            <Button
              variant="contained"
              sx={{ height: "100%", fontSize: "1rem" }}
              onClick={handlePendingItems}
            >
              Pending Items
            </Button>
          )}
          {invoice?.length > 0 && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                color="error"
                sx={{ height: "100%", fontSize: "1rem" }}
                onClick={retryInvoices}
                disabled={syncing}
              >
                {syncing ? `Syncing` : `Retry Invoices ( ${invoice.length} )`}
              </Button>
              <Button
                variant="outlined"
                color="error"
                sx={{ height: "100%", fontSize: "1rem" }}
                onClick={clearInvoices}
                disabled={syncing}
              >
                Stop Sync
              </Button>
            </Box>
          )}
        </Box>

        <ProductSelectionForm
          user={user}
          products={products}
          companies={companies}
          categories={categories}
          selectedCustomer={selectedCustomer}
          initialDataLoading={initialDataLoading}
          token={token}
          API_BASE_URL={API_BASE_URL}
          onAddProduct={handleAddProduct}
          formatCurrency={formatCurrency}
        />

        {/* {orderItems.length > 0 && ( */}
        <Box sx={{ my: 2 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6" gutterBottom>
              Order Preview
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              size="small"
              onClick={() => setOrderItems([])}
              disabled={loading}
              sx={{ mb: 1 }}
            >
              Clear Order
            </Button>
          </Box>
          <Box sx={{ height: 500 }}>
            {activeTab === 0 && (
              <List
                dense
                sx={{
                  height: 300,
                  overflowY: "auto",
                  border: "1px solid #eee",
                  borderRadius: "4px",
                }}
              >
                {orderItems.map((item, index) => (
                  <ListItem
                    key={`${item.productID}-${index}`}
                    divider
                    secondaryAction={
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleRemoveProduct(index)}
                        disabled={loading}
                        size="small"
                      >
                        <CloseIcon
                          sx={{
                            color: item.status?.toLowerCase().includes("short")
                              ? "white"
                              : "red",
                            fontWeight: "bold",
                          }}
                        />
                      </IconButton>
                    }
                    sx={{
                      py: 0.5,
                      backgroundColor: item.status
                        ?.toLowerCase()
                        .includes("short")
                        ? "red"
                        : "inherit",
                      color: item.status?.toLowerCase().includes("short")
                        ? "white"
                        : "black",
                    }}
                  >
                    <ListItemText
                      primary={item.name}
                      secondary={`Qty: ${item.orderQuantity} (${item.quantity
                        } TQ) | Rate: ${Number(item.rate).toFixed(0)} | ${item.company
                        } | ${item.model} | Amt: ${formatCurrency(item.amount)}`}
                      primaryTypographyProps={{
                        fontSize: { xs: "1rem", sm: "1.2rem" },
                        fontWeight: "bold",
                        noWrap: true,
                      }}
                      secondaryTypographyProps={{
                        fontSize: { xs: ".9rem", sm: "1rem" },
                        color: item.status?.toLowerCase().includes("short")
                          ? "white"
                          : "text.secondary",
                        noWrap: true,
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}

            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Typography variant="h6">
                <b>Total Items:</b> {orderItems.length}
              </Typography>
              <Typography variant="h5">
                <b>Total Amount: </b> {formatCurrency(totalAmount)}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            mt: 3,
            textAlign: "center",
            gap: 2,
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {postButtons.map((btn) => (
            <Button
              key={btn.text}
              variant="contained"
              color={btn.color}
              size="large"
              onClick={() => btn.text.toLowerCase() === 'invoice' ? getInvoicePreview(btn.text) : handlePostOrder(btn.text)}
              disabled={
                loading ||
                orderItems.length === 0 ||
                !selectedCustomer
              }
              sx={{ flex: 1, py: 1.5 }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Post ${btn.text}`
              )}
            </Button>
          ))}
        </Box>

        <OrderEntriesList 
          orders={myDailyOrders.slice().reverse()} 
          pendingCount={myDailyOrders.filter(o => !o.synced).length}
          onSyncOne={handleSyncOneOrder}
        />
      </Paper>
    </Container>
  );
};

export default OrderForm;
