import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
// import debounce from "lodash.debounce";

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
  FormControl, InputLabel, Select, MenuItem, FormHelperText
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
const spoList = ["ARIF", 'SALMAN', 'ZAIN', 'HAMZA',]
const postButtons = [
  { text: 'INVOICE', color: 'green' },
  { text: 'ESTIMATE', color: 'error' }
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
  // --- Redux State ---
  const { selectedCustomer } = useSelector(
    (state) => state.customerSearch.customers["orderForm"]
  );
  const dispatch = useDispatch()
  // --- Component State ---
  const [products, setProducts, productsLoaded] = useIndexedDBState(
    "products",
    []
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
  const [searchParams] = useSearchParams()
  const [spo, setSpo] = useState(user?.username);
  // const [spo, setSpo] = useLocalStorageState('SpoOrderform', user?.username);
  const acid = searchParams.get('acid');
  // --- Refs ---
  const customerInputRef = useRef(null);

  // --- Local Storage State ---
  const [invoice, setInvoice] = useLocalStorageState("invoice", null);
  const [orderItems, setOrderItems] = useLocalStorageState(
    "orderFormOrderItems",
    []
  );
  const [orderItemsTotalQuantity, setOrderItemsTotalQuantity] =
    useLocalStorageState("orderFormTotalQuantity", 0);
  const [selectedDate, setSelectedDate] = useLocalStorageState(
    "orderFormSelectedDate",
    new Date().toISOString().split("T")[0] // Store as YYYY-MM-DD
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
  const { retryInvoices, loading: syncing } = useInvoiceSync(invoice, setInvoice, token);
  // --- Effects ---

  useEffect(() => {
    dispatch(setIDWithKey({ key: 'orderForm', value: parseInt(acid) }))
    // dispatch(setIDInputWithKey({ key: 'orderForm', value: parseInt(acid) }))
  }, [acid, dispatch])

  // Ensure selected date is not in the past on initial load
  useEffect(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate < todayStr) {
      setSelectedDate(todayStr);
    }
  }, []); // Runs only on mount

  // Fetch initial products, companies, and categories
  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setInitialDataLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setInitialDataLoading(true);
      setError(null);

      try {
        if (navigator.onLine) {
          const headers = { Authorization: `Bearer ${token}` };
          const prodResponse = await axios.get(`${API_BASE_URL}/products`, {
            headers,
          });
          const allProducts = prodResponse.data || [];

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

          setProducts(cleanedProducts);
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        console.error("Error fetching initial data:", errorMessage);
        setError(`Failed to load initial data. ${errorMessage}`);
      } finally {
        setInitialDataLoading(false);
      }
    };

    if (productsLoaded) {
      setCompanies(
        [...new Set(products.map((p) => p.Company).filter(Boolean))].sort()
      );
      setCategories(
        [...new Set(products.map((p) => p.Category).filter(Boolean))].sort()
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

      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const params = { acid: selectedCustomer.acid, date: selectedDate };

        const [balRes, overDueRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/balance`, { params, headers }),
          axios.get(`${API_BASE_URL}/balance/overdue`, { params, headers }),
        ]);

        setBalance(formatCurrency(Math.round(balRes.data.balance)));
        setOverDue(formatCurrency(Math.round(overDueRes.data.overDue)));
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message;
        console.error("Error fetching customer financials:", errorMessage);
        setError(`Failed to load customer financials. ${errorMessage}`);
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
      0
    );
    setOrderItemsTotalQuantity(newTotalQuantity);
  }, [orderItems, setOrderItemsTotalQuantity]);





  // --- Event Handlers & Callbacks ---

  const HandleShortcuts = (event) => {

    // POST ESTIMATE
    if (event.altKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      handlePostOrder('ESTIMATE');
    }

    // POST INVOICE
    if (event.altKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      handlePostOrder('INVOICE');
    }
  }
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
      selectedCustomer.name || ""
    )}&acid=${encodeURIComponent(
      selectedCustomer.acid
    )}&startDate=${encodeURIComponent(
      ledgerStartDate
    )}&endDate=${encodeURIComponent(ledgerEndDate)}`;

    navigate(url, { state: { orderForm: true } });
  }, [selectedCustomer, selectedDate, navigate]);

  // Resets the state associated with the product input form
  const resetProductInputs = useCallback(() => {
    // This function can be expanded if ProductSelectionForm exposes a reset method via a ref
    // For now, it clears what it can from the parent.
  }, []);

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
    [selectedCustomer, setOrderItems, resetProductInputs]
  );

  const handleRemoveProduct = useCallback(
    (indexToRemove) => {
      setOrderItems((prev) => prev.filter((_, i) => i !== indexToRemove));
    },
    [setOrderItems]
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
        spo: String(spo || user?.username || 'no user'),
      })),
      orderDate: selectedDate,
      customerAcid: String(selectedCustomer.acid),
      userId: user?.UserID,
      totalAmount: orderItems.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      ),
      totalQuantity: Number(orderItemsTotalQuantity),
      status: status || "ESTIMATE",
    };

    try {
      console.log("Posting order with payload:", payload);
      const response = await axios.post(
        `${API_BASE_URL}/create-order`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setProducts(response.data.updatedProducts);
      setSuccess(response.data.message || "Order created successfully!");

      // Clear form state after successful post
      setOrderItems([]);
      setSelectedCustomer(null);
      resetProductInputs();
      setBalance(null);
      setOverDue(null);
      dispatch(clearSelection({ key: 'orderForm' }));
    } catch (err) {
      // Errors
      const errorMessage =
        err.response?.data?.message || "Failed to create order.";
      dispatch(clearSelection({ key: 'orderForm' }));
      console.error(
        "Order creation failed:",
        err.response?.data || err.message || err
      );
      setError(`${errorMessage} Please check details and try again.`);

      // for sync
      const confirmed = window.confirm("Are you sure you want to delete this and let it post automatically?");
      if (!confirmed) return;
      setInvoice(prev => [...prev, payload]);
      setOrderItems([]);
      setSelectedCustomer(null);
      resetProductInputs();// Save payload for retry if offline

    } finally {
      setLoading(false);
    }
  };

  const handlePendingItems = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/create-order/pendingitems`,
        {
          params: { acid: selectedCustomer?.acid },
        }
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

      setOrderItems((prev) => [...prev, ...transformedItems]);
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Could not fetch pending items.";
      setError(errorMessage);
    }
  };

  const totalAmount = useMemo(
    () => orderItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [orderItems]
  );

  return (
    <Container
      tabIndex={0}
      onKeyDown={HandleShortcuts}
      maxWidth={false}
      sx={{ all: "unset" }}
    >
      {(success || error) && (
        <Box >
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
              <InactiveItems
                acid={selectedCustomer.acid}
                handleRowClick={() => { }}
              />
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
                xs: 'none', md: 'block'
              }
            }}>
            <InputLabel id="shop-label">Spo</InputLabel>
            <Select
              labelId="customer-label"
              id="customer"
              value={spo}
              defaultValue={user?.username || 'no user'}
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
            <Button
              variant="contained"
              color="error"
              sx={{ height: "100%", fontSize: "1rem" }}
              onClick={retryInvoices}
              disabled={syncing}
            >
              {syncing ? `Syncing`
                : `Retry Invoices ( ${invoice.length} )`
              }
            </Button>
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

        {orderItems.length > 0 && (
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
            <List
              dense
              sx={{
                maxHeight: 300,
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
                      <CloseIcon sx={{
                        color: item.status
                          ?.toLowerCase()
                          .includes("short")
                          ? "white" : "red",
                        fontWeight: "bold"
                      }} />
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

            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Typography variant="h6">
                <b>Total Items:</b> {orderItems.length}
              </Typography>
              <Typography variant="h5">
                <b>Total Amount: </b> {formatCurrency(totalAmount)}
              </Typography>
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 3, textAlign: "center", gap: 2, display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
          {postButtons.map((btn) => (
            <Button
              variant="contained"
              color={btn.color}
              size="large"
              onClick={() => handlePostOrder(btn.text)}
              disabled={
                loading ||
                initialDataLoading ||
                orderItems.length === 0 ||
                !selectedCustomer
              }
              sx={{ minWidth: "200px" }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Post ${btn.text}`
              )}
            </Button>
          ))}
        </Box>
      </Paper>
    </Container>
  );
};

export default OrderForm;
