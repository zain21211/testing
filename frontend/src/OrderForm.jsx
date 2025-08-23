import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";

import { useNavigate, useLocation } from "react-router-dom";
import Fade from "@mui/material/Fade";
import { styled } from "@mui/material/styles";
import axios from "axios";
import useGeolocation from "./hooks/geolocation"; // Removed unused hook
import { useLocalStorageState } from "./hooks/LocalStorage"; // Assuming this hook exists
import debounce from "lodash.debounce"; // Import debounce utility
import Storage from "use-local-storage-state";
import { useIndexedDBState } from "./hooks/indexDBHook"; // Assuming this hook exists
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
  FormControlLabel,
  Checkbox,
  Alert,
  Paper,
  Autocomplete,
  CircularProgress,
} from "@mui/material";
import InactiveItems from "./components/InactiveItems.jsx";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete"; // Added delete icon if needed later
import LedgerSearchForm from "./CustomerSearch.jsx"; // Assuming this component exists
import ProductSelectionForm from "./ProductSelectionForm.jsx"; // Assuming this component exists
const biggerInputTextSize = '1.5rem'; // For text inside input fields
const biggerShrunkLabelSize = '0.9rem';  // For labels when they shrink (float above)
const biggerCheckboxLabelSize = '1rem'; // For checkbox labels

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0.00";
  // Format to 0 decimal places for currency string, but keep as number for calculations
  // Use toLocaleString for thousands separators
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Configure IndexedDB
// localforage.config({
//   name: "store-app",
//   storeName: "products",
// });

// const customTextField = {
//                 width: { xs: "100%", md: "150px" }, // Control width
//                 "& .MuiOutlinedInput-root": {
//                   backgroundColor: overDue !== "0.00" ? "red" : "transparent", // Background color based on value
//                   "& fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined, // Border color
//                   },
//                   "&:hover fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined,
//                   },
//                   "&.Mui-focused fieldset": {
//                     borderColor: overDue !== "0.00" ? "red" : undefined,
//                   },
//                 },
//                 "& .Mui-disabled": {
//                   fontWeight: "bold",
//                 },
//               }

// --- Utility Functions ---
// Removed local debounce as lodash.debounce is imported now


function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeWildcardRegex(filter) {
  if (!filter || filter.trim() === "") return null;

  const lowerFilter = filter.toLowerCase().trim();

  // Split on both spaces and % as wildcards
  const terms = lowerFilter.split(/[%\s]+/).map(escapeRegExp);

  // Start with the first term anchored to the start, then allow other terms to appear in order
  const pattern = `^${terms[0]}.*${terms.slice(1).join(".*")}`;

  try {
    return new RegExp(pattern, "i"); // 'i' for case-insensitive
  } catch (e) {
    console.error("Invalid regex:", pattern, e);
    return null;
  }
}


const url = import.meta.env.VITE_API_URL;
const frontend = import.meta.env.VITE_WEB_URL;

// Add this debounce helper function outside your component
function newDebounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

const OrderForm = () => {
  console.log("OrderForm rendering or re-rendering");

  // --- State Variables ---
  const [products, setProducts, productsLoaded] = useIndexedDBState("products", []);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [companyInputValue, setCompanyInputValue] = useState("");
  const [categoryInputValue, setCategoryInputValue] = useState("");
  const [loading, setLoading] = useState(false); // General loading for API calls
  const [initialDataLoading, setInitialDataLoading] = useState(true); // Specific for initial products/customers
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [token] = useState(localStorage.getItem("authToken"));
  const productInputRef = useRef(null);
  const productIDInputRef = useRef(null); // Ref for product ID input
  const customerInputRef = useRef(null);
  const [perAmount, setPerAmount] = useState(0);
  const companyInputRef = useRef(null);
  const [schPCS, setSchPCS] = useState(0)
  const [schPrice, setSchPrice] = useState(0); // Scheme price
  const [overDue, setOverDue] = useState(null);
  const [balance, setBalance] = useState(null);
  const quantityInputRef = useRef(null);
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [productInputValue, setProductInputValue] = useState("");
  const user = JSON.parse(localStorage.getItem("user"));
  const [cost, setCost] = useState(0);
  const [open, setOpen] = useState(true)
  // const [isCustomer, setIsCustomer] = Storage('isCustomer', false); // Track if a customer is selected
  const [profit, setProfit] = useState(0);



  // STATES MANAGED IN OrderForm (and localStorage)
  // Use a specific key for the selected customer OBJECT
  const [selectedCustomer, setSelectedCustomer] = useLocalStorageState(
    "orderFormSelectedCustomer",
    null
  );
  const [invoice, setInvoice] = useLocalStorageState(
    "invoice",
    null
  );

  // Product/Order states
  const [selectedProduct, setSelectedProduct] = useLocalStorageState(
    "orderFormSelectedProduct",
    null
  );
  // orderQuantity is the quantity the user types
  const [orderQuantity, setOrderQuantity] = useLocalStorageState(
    "orderFormOrderQuantity",
    0
  );
  // quantity is the total quantity including scheme (orderQuantity + schPc)
  const [quantity, setQuantity] = useState(0); // Derived state, no need for LS state
  const [companyFilter, setCompanyFilter] = useLocalStorageState(
    "orderFormCompanyFilter",
    ""
  );

  const [customerInput, setCustomerInput] = Storage(
    "orderFormCustomerInput",
    ""
  ); // For customer search input
  const [orderItems, setOrderItems] = useLocalStorageState(
    "orderFormOrderItems",
    []
  );
  // Total amount and orderQuantity are derived, maybe no need for LS?
  // But keeping them for now if needed elsewhere or for quick display
  const [totalAmount, setTotalAmount] = useLocalStorageState(
    "orderFormTotalAmount",
    0
  );
  const [orderItemsTotalQuantity, setOrderItemsTotalQuantity] =
    useLocalStorageState("orderFormTotalQuantity", 0);

  const [discount1, setDiscount1] = useLocalStorageState(
    "orderFormDiscount1",
    0
  );
  const [discount2, setDiscount2] = useLocalStorageState(
    "orderFormDiscount2",
    0
  );

  const [schOn, setSchOn] = useState(0)

  const location = useLocation(); // Get current location for unique product ID key
  const [productID, setProductID] = Storage(`prid${location.pathname}`); // Product ID for the current item
  const [productIDInput, setProductIDInput] = Storage(
    `pridInput${location.pathname}`
  ); // Input for product ID
  // Store numeric price and calculate/store numeric amount
  const [price, setPrice] = useState(selectedProduct?.SaleRate); // Selected product's sale rate
  const [calculatedAmount, setCalculatedAmount] = useState(0); // Numeric amount for the current item
  const [vest, setVest] = useState(0); // Numeric vest value for the current item

  const [schPc, setSchPc] = useState(0); // Scheme pieces for current item
  const [scheme, setScheme] = useState(""); // Scheme text for current item
  const [categoryFilter, setCategoryFilter] = useLocalStorageState(
    "orderFormCategoryFilter",
    ""
  );
  const [suggestedPrice, setSuggestedPrice] = useState(
    selectedProduct?.SaleRate || 0
  ); // Suggested price for current item
  const [isClaim, setIsClaim] = useState(false); // Claim status for current item
  const [Sch, setSch] = useState(true); // Scheme applicability for current item (default true)
  const [productRemakes, setProductRemakes] = useState(""); // Remakes for current item

  // Date state (use YYYY-MM-DD format internally and for API)
  const [selectedDate, setSelectedDate] = useLocalStorageState(
    "orderFormSelectedDate",
    new Date().toISOString().split("T")[0] // Store as YYYY-MM-DD
  );

  const co = useGeolocation();
  const isCustomer = !!customerInput; // Check if a customer is selected based on acid
  const userType = user?.userType?.toLowerCase();
  const isAllowed = userType?.includes("sm") || userType?.includes("admin");

  // Calculate min and max dates (7 days before and after today)
  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => {
    const d = new Date(today);
    // d.setDate(today.getDate() - 7); // Example: 7 days before today
    // Based on comment, perhaps just today is the min date?
    return d.toISOString().split("T")[0];
  }, [today]);
  const maxDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(today.getDate() + 7); // 7 days after today
    return d.toISOString().split("T")[0];
  }, [today]);

  const API_BASE_URL = url;

  useEffect(() => {
    const date = new Date().toISOString().split("T")[0]; // "2025-06-18"
    console.log("date: ", typeof selectedDate)
    if (selectedDate < date)
      setSelectedDate(date)
  }, [])
  // --- Debounced Update Functions ---
  const debouncedSetCompanyFilter = useCallback(
    debounce((value) => {
      setCompanyFilter(value);
      setSelectedProduct(null); // Clear selected product when filter changes
    }, 300), // Adjust debounce delay as needed
    []
  );

  const debouncedSetCategoryFilter = useCallback(
    debounce((value) => {
      setCategoryFilter(value);
      setSelectedProduct(null); // Clear selected product when filter changes
    }, 300), // Adjust debounce delay as needed
    []
  );

  const handleRowClick = (prid) => {
    // alert("in function" + prid)
    const product = products.filter(item => item.ID === prid)
    setSelectedProduct(product)
  }

  const BigTextField = styled(TextField)({
    "& .MuiInputBase-root": {
      fontSize: "1.4rem",
      width: "auto",
      minWidth: "150px",
    },
    "& .MuiInputBase-input": {
      fontWeight: "bold", // Input text
      textAlign: "center",
      letterSpacing: "1.5px", // 👈 adjust this value as needed     // Input text center
    },
    "& label": {
      fontSize: "1rem",
      fontWeight: "bold", // Label normal
    },
    "& label.Mui-focused": {
      fontSize: "1.1rem",
      fontWeight: "bold", // Label when focused
    },
    "& .MuiInputLabel-root": {
      transformOrigin: "top left",
    },
  });

  // --- Effects ---
  const handlePrint = () => {
    window.print;
  };

  useEffect(() => {
    if (!isCustomer) {
      // If customerInput is empty but selectedCustomer is set, update input to match
      setSelectedCustomer(null);
    }
  }, [isCustomer]);

  useEffect(() => {
    // const getDoc = async () => {
    //   try {
    //     const response = await axios.get(`${url}/create-order/doc`, {
    //       params: {
    //         acid: selectedCustomer?.acid || "",
    //       },
    //     });
    //     const { nextDoc, date, total } = response.data;
    //     setDoc(nextDoc);
    //     setPerAmount(Math.round(total));
    //   } catch (error) {
    //     console.error(error);
    //   }
    // };

    // if (selectedCustomer) {
    //   getDoc();
    // }
  }, [selectedCustomer]);

  // for fetch the Cost
  useEffect(() => {
    const getCost = async () => {
      try {
        const response = await axios.get(`${url}/create-order/cost`, {
          params: {
            ItemCode: selectedProduct?.code || "",
          },
        });
        const cost = response.data;
        setCost(cost);
      } catch (error) {
        console.error(error);
      }
    };

    if (selectedProduct) {
      getCost();
    }
  }, [selectedProduct, API_BASE_URL]);

  const handleCustomer = (value) => {
    setCustomerInput(value);
  };

  useEffect(() => {
    if (userType?.includes('cust')) {
      setCompanyFilter("fit")
      setCompanyInputValue("fit")
    }
  }, [user])

  useEffect(() => {
    // function parseAmountString(amountStr) {
    //   console.log("the tyrpe ", typeof amountStr);
    //   if (typeof amountStr !== "string") return 0;

    //   // Remove all commas and parse as number
    //   const cleaned = amountStr.replace(/,/g, "");
    //   const number = parseFloat(cleaned);

    //   return isNaN(number) ? 0 : number;
    // // }

    // Only calculate if all required values are present and valid
    if (cost && orderQuantity) {
      const net_profit =
        ((calculatedAmount || 0) / (quantity || 0) - cost.cost) * (quantity || 0);
      setProfit(Math.round(net_profit));
    } else {
      setProfit(0);
    }
  }, [calculatedAmount, quantity, cost, API_BASE_URL]);

  // Effect to fetch customer balance and overdue based on selected customer and date
  useEffect(() => {
    const fetchCustomerFinancials = async () => {
      if (!selectedCustomer || !selectedCustomer.acid) {
        setBalance(null);
        setOverDue(null);
        return;
      }

      setLoading(true); // Set loading specifically for this fetch
      setError(null); // Clear previous errors

      try {
        // Assuming balance API takes acid and date (YYYY-MM-DD format)
        const responseBal = await axios.get(`${API_BASE_URL}/balance`, {
          params: {
            acid: selectedCustomer.acid,
            date: selectedDate, // selectedDate is already YYYY-MM-DD
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });
        const { balance } = responseBal.data;
        setBalance(formatCurrency(Math.round(balance)));

        // Assuming overdue API takes acid and date (YYYY-MM-DD format)
        const responseOver = await axios.get(
          `${API_BASE_URL}/balance/overdue`,
          {
            params: {
              acid: selectedCustomer.acid,
              date: selectedDate, // selectedDate is already YYYY-MM-DD
            },
            headers: { Authorization: `Bearer ${token}` }, // Add token
          }
        );

        const { overDue } = responseOver.data;
        setOverDue(formatCurrency(Math.round(overDue)));
      } catch (err) {
        console.error("Error fetching customer financials:", err);
        setError(
          `Failed to load customer financials. ${err.response?.data?.message || err.message
          }`
        );
        setBalance(null);
        setOverDue(null);
      } finally {
        // Only turn off loading if *this* fetch is complete
        // Be careful if other operations also set 'loading'
        setLoading(false);
      }
    };

    // Fetch whenever selectedCustomer or selectedDate changes
    fetchCustomerFinancials();
  }, [selectedCustomer, selectedDate, API_BASE_URL, token]); // Added dependencies

  // Effect to fetch discount based on selected customer and product company
  useEffect(() => {
    const fetchDiscount = async () => {
      if (
        (!selectedProduct && !selectedCustomer) ||
        !selectedCustomer?.acid ||
        !selectedProduct?.Company
      ) {
        setDiscount1(0);
        setDiscount2(0);
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/discount`, {
          params: {
            acid: selectedCustomer.acid,
            company: selectedProduct.Company,
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const { disc1P, discount } = response.data;
        setDiscount1(disc1P || 0);
        setDiscount2(discount || 0);
      } catch (error) {
        console.error(
          "Error fetching discount:",
          error.response?.data?.message || error.message || error
        );
        // Do not set error state here, just log and reset discounts
        setDiscount1(0);
        setDiscount2(0);
      }
    };
    // Fetch whenever selectedProduct, selectedCustomer, or API_BASE_URL changes
    fetchDiscount();
  }, [selectedProduct, selectedCustomer, API_BASE_URL, token]); // Added dependencies

  // for prid and productIDInput
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (productIDInput !== productID) {
        setProductID(productIDInput); // Update internal accountID from manual input (triggers customer search)
      }
    }, 2000);
    return () => clearTimeout(timeout);
  }, [productID, productIDInput]);

  // Effect to fetch scheme slabs for the selected product
  useEffect(() => {
    const getSchSlabs = async () => {
      if (!selectedProduct || !selectedProduct.code) {
        setScheme("");
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/scheme/all`, {
          params: {
            productCode: selectedProduct.code,
            date: new Date().toISOString().split("T")[0], // Pass current date in YYYY-MM-DD
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const sch = response.data; // Assuming response.data is the scheme object

        const schemeText = `${sch.SchOn}+${sch.SchPc}`;
        setSchPCS(sch.SchPc)
        setSchOn(sch.SchOn)
        setScheme(schemeText);
        // if (Array.isArray(response.data) && response.data.length > 0) {
        //   // Format all applicable schemes into a readable string
        //    response.data
        //     .map((sch) => `${sch.SchOn} + ${sch.SchPc}`)
        //     .join(", ");
        // } else {
        //   setScheme("N/A"); // Indicate no scheme found
        // }
      } catch (err) {
        console.error(
          "Error while getting the slabs:",
          err.response?.data?.message || err.message || err
        );
        setScheme("Error fetching schemes"); // Indicate error
      }
    };

    getSchSlabs();
  }, [selectedProduct, API_BASE_URL, token]); // Added dependencies

  useEffect(() => {
    setTimeout(() => {
      console.log("location is very much changed:", co);
    }, 1000);
  }, [co]);

  useEffect(() => {
    const saleRate = selectedProduct?.SaleRate;
    setSuggestedPrice(saleRate);
    setPrice(saleRate);
  }, [selectedProduct]);


  // Effect to calculate scheme pieces (SchPc) based on orderQuantity and selected product
  useEffect(() => {
    const getSch = async () => {
      // Ensure product, quantity > 0, and scheme is applicable
      if (
        !selectedProduct ||
        !selectedProduct.code ||
        orderQuantity <= 0 ||
        !Sch
      ) {
        setSchPc(0); // Reset scheme pieces if conditions not met
        setQuantity(orderQuantity); // Total quantity is just order quantity
        return;
      }
      try {
        const response = await axios.get(`${API_BASE_URL}/scheme`, {
          params: {
            productCode: selectedProduct.code,
            orderQty: orderQuantity,
            date: new Date().toISOString().split("T")[0], // Pass current date
          },
          headers: { Authorization: `Bearer ${token}` }, // Add token
        });

        const { SchOn, SchPc: calculatedSchPc } = response.data; // Renamed SchPc to avoid conflict
        let pcs = 0;
        setSchOn(SchOn)
        if (SchOn > 0) {
          // Ensure SchOn is positive to avoid division by zero
          pcs =
            Math.floor(Number(orderQuantity) / Number(SchOn)) *
            Number(calculatedSchPc);
          // Use Math.floor if scheme applies per block (e.g., buy 10 get 1, buying 25 gets 2, not 2.5)
        }
        setSchPc(pcs);
        setQuantity(orderQuantity + pcs); // Total quantity = ordered + scheme pieces
      } catch (err) {
        console.error(
          "Error while getting the calculated scheme pieces:",
          err.response?.data?.message || err.message || err
        );
        // Do not set error state here, just log and reset scheme pieces
        setSchPc(0); // Reset on error
        setQuantity(orderQuantity); // Total quantity is just order quantity
      }
    };

    // Recalculate when orderQuantity, selectedProduct, or Sch flag changes
    getSch();
  }, [orderQuantity, selectedProduct, Sch]); // Added dependencies

  useEffect(() => {
    setPrice(selectedProduct?.SaleRate)
  }, [selectedProduct])

  // Effect to calculate price, vest, and amount for the current item
  useEffect(() => {
    const currentPrice = price ?? 0;
    // setPrice(currentPrice); // Set price state for display

    const numericOrderQuantity = Number(orderQuantity) || 0; // Ensure number, default to 0
    const numericPrice = Number(currentPrice) || 0; // Ensure number, default to 0
    const numericDiscount1 = Number(discount1) || 0;
    const numericDiscount2 = Number(discount2) || 0;

    // Calculate Vest: Order Quantity * Price
    const calculatedVest = numericOrderQuantity * numericPrice;
    setVest(calculatedVest); // Store numeric Vest

    // Calculate Total Item Amount after discount
    const totalDiscountPercentage = (numericDiscount1 + numericDiscount2) / 100;
    const discountAmount = calculatedVest * totalDiscountPercentage;
    const finalAmount = calculatedVest - discountAmount;

    setCalculatedAmount(finalAmount); // Store numeric calculated amount
  }, [orderQuantity, selectedProduct, price, discount1, discount2]); // Recalculate when these change`

  // load all the products
  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setInitialDataLoading(false);
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      setInitialDataLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Only fetch from API if online
        if (navigator.onLine) {
          const prodResponse = await axios.get(`${API_BASE_URL}/products`, { headers });
          const allProducts = prodResponse.data || [];

          const cleanedProducts = allProducts
            .map(p => ({
              ...p,
              Name: p.Name ? String(p.Name).trim() : "",
              Company: p.Company ? String(p.Company).trim() : "",
              Category: p.Category ? String(p.Category).trim() : "",
              SaleRate: p.SaleRate ?? 0,
              ID: p.ID,
              code: p.code,
              StockQty: p.StockQty ?? 0,
            }))
            .filter(p => p.ID != null && p.Name && p.Name.trim() !== "");

          // Just update state — persistence happens automatically
          setProducts(cleanedProducts);
        }
      } catch (err) {
        console.error(
          "Error fetching initial data:",
          err.response?.data?.message || err.message || err
        );
        setError(`Failed to load initial data. ${err.response?.data?.message || err.message}`);
      } finally {
        setInitialDataLoading(false);
        setLoading(false);
      }
    };

    // Only fetch if initial IndexedDB load is done
    if (productsLoaded) {
      // Always set companies/categories from whatever is in IndexedDB first
      setCompanies([...new Set(products.map(p => p.Company).filter(Boolean))].sort());
      setCategories([...new Set(products.map(p => p.Category).filter(Boolean))].sort());

      fetchInitialData();
    }
  }, [token, productsLoaded]); // productsLoaded ensures offline data is loaded first



  useEffect(() => {
    const saleRate = Number(selectedProduct?.SaleRate) || 0;
    const totalUnits = (schPCS || 0) + (schOn || 0);

    if (totalUnits === 0) {
      setSchPrice(0); // Avoid divide-by-zero
      return;
    }

    const amount = (saleRate * (schOn || 0)) / totalUnits;
    setSchPrice(Math.round(amount));
  }, [scheme]);


  // Effect to recalculate total amount and total quantity whenever orderItems changes
  useEffect(() => {
    const newTotalAmount = orderItems.reduce((sum, item) => {
      // item.amount is already numeric here
      return sum + (Number(item.amount) || 0); // Ensure numeric and default to 0 for safety
    }, 0);
    const newTotalQuantity = orderItems.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0);
    }, 0);

    setTotalAmount(newTotalAmount);
    setOrderItemsTotalQuantity(newTotalQuantity);
  }, [orderItems]);

  const filteredAutocompleteOptions = useMemo(() => {
    if (initialDataLoading) {
      return [];
    }

    let filtered = [...products];

    // Filter by Company
    if (companyFilter && companyFilter.trim() !== "") {
      const companyRegex = makeWildcardRegex(companyFilter);
      if (companyRegex) {
        filtered = filtered.filter(
          (p) => p.Company && companyRegex.test(p.Company.toLowerCase())
        );
      } else {
        if (companyFilter.trim()) filtered = []; // Invalid pattern
      }
    }

    // Filter by Category (Model)
    if (categoryFilter && categoryFilter.trim() !== "") {
      const categoryRegex = makeWildcardRegex(categoryFilter, "model");
      if (categoryRegex) {
        filtered = filtered.filter(
          (p) => p.Category && categoryRegex.test(p.Category.toLowerCase())
        );
      } else {
        if (categoryFilter.trim()) filtered = []; // Invalid pattern
      }
    }

    // Filter by product name typed in autocomplete
    if (productInputValue.trim() && !productID) {
      const nameRegex = makeWildcardRegex(productInputValue);
      if (nameRegex) {
        filtered = filtered.filter(
          (p) => p.Name && nameRegex.test(p.Name.toLowerCase())
        ).slice(0, 8);

      } else {
        return []; // Invalid pattern
      }
    } else {
      // If no input value, return all products that match filters
      filtered = products.filter((p) => String(p.ID) === String(productID));
      setSelectedProduct(filtered[0] || null); // Set selected product if foun
      quantityInputRef?.current?.focus;
    }

    return filtered;
    // Memoize based on products, filters, and input value
  }, [
    products,
    companyFilter,
    categoryFilter,
    productInputValue,
    initialDataLoading,
    productID,
  ]);

  // --- Event Handlers ---

  // BUG FIX: This useEffect was removed. Its logic was too broad and could cause
  // unintended resets. The logic is now handled more explicitly inside the
  // Autocomplete's event handlers.
  // useEffect(() => {
  //   if (productID) {
  //     setProductID(null);
  //     setProductIDInput(null);
  //   }
  // }, [productInputValue]);

  useEffect(() => {
    // This effect correctly syncs the ID input when a product is selected.
    // The new robust clearing logic in the handlers prevents this from causing issues.
    if (selectedProduct && !productID) {
      setProductIDInput(selectedProduct.ID);
    }
  }, [selectedProduct]);

  // Handler for when a customer is selected from LedgerSearchForm
  const handleSelectCustomer = useCallback((customer) => {
    // Store the selected customer object in OrderForm state (and LS)
    setSelectedCustomer(customer);
    // If a customer is selected, attempt to focus the company input or product input
    if (customer) {
      // Clear any previous product/filters when customer changes? Depends on UX desired.
      // Maybe keep filters/product to re-add items for this customer? Let's keep them for now.
      // Focus the first relevant input
      companyInputRef.current?.focus();
    }
  }, []); // setSelectedCustomer is stable

  const handleEnterkey = (e) => {
    // Only handle "Enter" key
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddProduct();
    }
  };


  useEffect(() => {
    const handleOnline = async () => {
      if (invoice) {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/create-order`,
            invoice,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log("Invoice posted automatically:", response.data);
          setInvoice({}); // Clear after success
        } catch (error) {
          console.error("Retry failed:", error);
        }
      }
    };

    // Listen for browser coming online
    window.addEventListener("online", handleOnline);

    // If already online and invoice exists, try posting immediately
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [invoice, setInvoice, token]);



  const handleLedgerClick = useCallback(() => {
    if (!selectedCustomer || !selectedCustomer.acid || !selectedDate) {
      // Maybe show an alert or error message
      setError("Please select a customer and a date to view the ledger.");
      return;
    }

    // Construct URL using selectedCustomer.acid and selectedCustomer.name, and dates
    // Use selectedDate directly (it's YYYY-MM-DD) for constructing date range for ledger API if needed
    // The LedgerSearchForm component handles date range calculation internally based on type
    // But if the ledger page itself needs specific start/end dates, calculate them here.
    // Based on the previous code, it seems the ledger page uses dates calculated relative to the selectedDate.
    const endDateObj = new Date(selectedDate);
    const startDateObj = new Date(selectedDate);
    startDateObj.setMonth(startDateObj.getMonth() - 3);

    // Format dates as YYYY-MM-DD for the URL params
    const ledgerStartDate = startDateObj.toISOString().split("T")[0];
    const ledgerEndDate = endDateObj.toISOString().split("T")[0];

    // Construct the URL for the ledger page
    const url = `/ledger?name=${encodeURIComponent(
      selectedCustomer.name || ""
    )}&acid=${encodeURIComponent(
      selectedCustomer.acid
    )}&startDate=${encodeURIComponent(
      ledgerStartDate
    )}&endDate=${encodeURIComponent(ledgerEndDate)}`;

    // Use navigate or window.open depending on desired behavior
    // window.open(url, "_blank"); // Open in new tabR
    navigate(url, {
      state: {
        orderForm: true
      }
    });
  }, [selectedCustomer, selectedDate, navigate]); // Added navigate dependency
  const handleAddProduct = useCallback((item) => {
    setError(null);
    setSuccess(null);

    // // Validation
    // if (!selectedCustomer?.acid) {
    //   setError("Please select a customer first.");
    //   return;
    // }
    // if (!selectedProduct?.ID) {
    //   setError("Please select a product from the list.");
    //   return;
    // }
    // if (!orderQuantity || orderQuantity <= 0) {
    //   setError("Please specify a valid quantity (at least 1).");
    //   return;
    // }
    // if (!item) {
    //   setError("No item provided.");
    //   return;
    // }
    item.customerID = selectedCustomer.acid // Add customer ID to item for clarity/payload

    // Update state with functional update (always latest)
    setOrderItems(prev => {
      console.log("Prev items:", prev);
      console.log("Adding item:", item);
      return [...prev, item];
    });

    // Reset inputs
    setSelectedProduct(null);
    setOrderQuantity(0);
    setSchPc(0);
    setQuantity(0);
    setDiscount1(0);
    setDiscount2(0);
    setPrice(0);
    setSuggestedPrice(0);
    setVest(0);
    setCalculatedAmount(0);
    setIsClaim(false);
    setSch(true);
    setProductRemakes("");
    setProductID(null);
    setProductIDInput(null);
    setProductInputValue("");

    // Refocus
    setTimeout(() => {
      if (user.userType.toLowerCase().includes("sm"))
        productIDInputRef.current?.focus();
      else
        productInputRef.current?.focus();
    }, 50);
  }, [
    selectedCustomer,
    selectedProduct,
    orderQuantity,
    user, // only what's really needed
  ]);



  // useEffect(() => {
  //   if(productIDInput?.length === 1 || productID?.length === 1) {
  //     setCompanyFilter("");
  //     setCategoryFilter("");
  //   }
  // }, [productID, productIDInput]);

  useEffect(() => {
    console.log('preducts', products)
  }, [products])
  const debouncedSetProductInputValue = setProductInputValue
  const handleRemoveProduct = useCallback((indexToRemove) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== indexToRemove));
  }, []); // No dependencies needed

  const handlePostOrder = async () => {
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    // Final validation before posting
    if (!selectedCustomer || !selectedCustomer.acid) {
      setError("Please select a customer before posting the order.");
      return;
    }

    if (orderItems.length === 0) {
      setError("Cannot post an empty order. Please add at least one product.");
      return;
    }

    setLoading(true); // Set general loading for this operation

    orderItems.map((item) => {
      console.log("this the item profit ", item.profit);
    });

    const payload = {
      products: orderItems.map((item) => ({
        date: selectedDate, // Use the date in YYYY-MM-DD format
        acid: String(selectedCustomer.acid), // Ensure acid is string
        type: "SALE", // Assuming type is always SALE
        qty: Number(item.orderQuantity), // Ordered quantity
        aQty: Number(item.orderQuantity), // Appears to be same as qty? Confirm API needs
        bQty: Number(item.orderQuantity), // Total quantity (including scheme)
        rate: Number(item.rate),
        suggestedPrice: Number(item.suggestedPrice),
        vest: Number(item.vest),
        discP1: Number(item.discount1), // Percentage discount 1
        discP2: Number(item.discount2), // Percentage discount 2
        // 'vist' seems like a typo or misnaming for the final item amount
        // Use the calculated numeric amount from item.amount
        vist: Math.round(item.amount),
        SchPc: Number(item.schPc) || 0,
        sch: Boolean(item.Sch), // Ensure boolean
        isClaim: Boolean(item.isClaim), // Ensure boolean
        prid: String(item.productID) || "0", // Ensure product ID is string, default to '0' if null/undefined
        profit: item.profit,
        remakes: item.remakes || "", // Include remakes
      })),
      // Add other top-level order details if API expects them (e.g., CustomerID, Date, Location, User)
      orderDate: selectedDate,
      customerAcid: String(selectedCustomer.acid),
      userId: user?.UserID, // Assuming user object has UserID// Use coords if location hook was active
      // Add any other required fields like total amount, total quantity etc.
      totalAmount: doc ? Number(totalAmount + perAmount) : totalAmount,
      totalQuantity: Number(orderItemsTotalQuantity),
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

      const { updatedProducts, invoiceNumber } = response.data

      // const path = `/invoice/${invoiceNumber}`
      // navigate(path, {
      //   state: { fromOrderPage: true },
      // });
      setProducts(updatedProducts)
      // Handle success
      setSuccess(response.data.message || "Order created successfully!");

      // Clear form/state after successful post
      setOrderItems([]);
      setSelectedCustomer(null); // Clear selected customer (updates LS via hook)
      setSelectedProduct(null);
      setCompanyFilter(""); // Clear filters (updates LS)
      setCategoryFilter(""); // Clear filters (updates LS)
      setCompanyInputValue(""); // Clear input text
      setCategoryInputValue(""); // Clear input text
      setProductInputValue(""); // Clear input text
      setOrderQuantity(0); // Clear quantity (updates LS)
      setSchPc(0); // Clear scheme pieces
      setQuantity(0); // Clear total quantity
      setPrice(0); // Clear price
      setSuggestedPrice(0); // Clear suggested price
      setVest(0); // Clear vest
      setCalculatedAmount(0); // Clear amount
      setDiscount1(0); // Clear discounts (updates LS)
      setDiscount2(0); // Clear discounts (updates LS)
      setIsClaim(false); // Reset checkboxes
      setSch(true); // Reset checkboxes
      setProductRemakes(""); // Clear remakes
      setBalance(null); // Clear customer financials
      setOverDue(null); // Clear customer financials
      setTotalAmount(0); // Clear derived totals (updates LS)
      setOrderItemsTotalQuantity(0); // Clear derived totals (updates LS)
      setCustomerInput(null); // Clear customer input text
      // setCustomerName(""); // Clear customer name
      setProductID(null); // Clear product ID
      setProductIDInput(null); // Clear product ID input text
    } catch (err) {
      setInvoice(prev => ({ ...prev, payload })); // Reset invoice number on error
      console.error(
        "Order creation failed:",
        err.response?.data || err.message || err
      );
      setError(
        err.response?.data?.message ||
        "Failed to create order. Please check details and try again."
      );
      // Keep the order items in state so the user doesn't lose their work if post fails
    } finally {
      setLoading(false); // Turn off loading regardless of success/failure
    }
  };

  const handlePendingItems = async () => {
    const response = await axios.get(`${url}/create-order/pendingitems`, {
      params: {
        acid: selectedCustomer?.acid,
      }

    })

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
      suggestedPrice: Number(item.SaleRate) || 0, // Assuming same as sale rate
      vest: 0, // No info in the response; set default or calculate separately
      discount1: Number(item.DiscP) || 0,
      discount2: Number(item.DiscP2) || 0,
      amount: Number(item.Amount) || 0,
      isClaim: item.isClaim,
      Sch: item.Sch,
      profit: Number(item.Profit) || 0,
      remakes: "", // Assuming no remakes in pendingItems, set empty or default
    }));


    setOrderItems((prev) => [...prev, ...transformedItems]);


  }


  // Handle date change - store the YYYY-MM-DD string value
  const handleDateInputChange = (e) => {
    setSelectedDate(e.target.value); // Store the YYYY-MM-DD string directly
  };

  const handleCheckBox = (event, field) => {
    const checked = event.target.checked;
    if (field === "sch") {
      setSch(checked);
    } else if (field === "isClaim") {
      setIsClaim(checked);
    }
  };

  const getNoOptionsText = () => {
    if (initialDataLoading) return "Loading products...";
    if (!products.length) return "No products available.";
    if (productInputValue.length < 2) return "Type at least 2 letters";
    if (
      (companyFilter || categoryFilter || productInputValue.trim()) &&
      filteredAutocompleteOptions.length === 0
    )
      return "No products match filters.";

    return "No matching products found.";
  };

  // Stock availability check for input field border color
  const hasStock = selectedProduct
    ? (selectedProduct.StockQty ?? 0) >= orderQuantity
    : true; // Assume stock is OK if no product selected

  return (
    <Container
      maxWidth={false}
      sx={{
        all: "unset",
      }}
    >
      {/* Error and Success Alerts */}
      {(success || error) && (
        <Box sx={{ my: 2 }}>
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
          mb: 2,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(2, 1fr)" }, // Adjusted grid for small screens
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
        }}
      >
        {/* Customer Search */}
        <Box
          sx={{
            gridColumn: {
              xs: "span 2", // Full width on xs
              sm: selectedCustomer ? "span 5" : "span 7",
              md: selectedCustomer ? "span 6" : "span 8",
              xl: "span 4",
            },
            minWidth: { xs: "auto", sm: 250 }, // Allow auto width on xs
          }}
        >
          <LedgerSearchForm
            usage="orderForm"
            onSelect={handleSelectCustomer}
            onCustomerInputChange={handleCustomer}
            name={selectedCustomer?.name || ""}
            loading={loading || initialDataLoading}
            inputRef={customerInputRef}
            disabled={orderItems.length > 0} // Disable if items already added
          />
        </Box>

        {/* Ledger Button — only if customer is selected */}
        {selectedCustomer && (
          <Box
            sx={{
              gridColumn: {
                xs: "span 1", // Half width on xs
                sm: "span 2",
                md: "span 2",
                xl: "span 1",
              },
              height: { xs: "56px", sm: "77%" }, // Adjust height for small screens
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
                "&:hover": {
                  backgroundColor: "primary.dark", // Darker shade on hover
                  color: "white",
                  borderColor: "primary.dark",
                },
              }}
            >
              LEDGER
            </Button>
          </Box>
        )}

        {/* Date Picker */}
        <Box
          sx={{
            gridColumn: {
              xs: "span 1", // Half width on xs
              sm: "span 2",
              md: "span 2",
            },
            minWidth: { xs: "auto", sm: 150 }, // Allow auto width on xs
          }}
        >
          <TextField
            fullWidth // Make date picker full width in its grid item
            type="date"
            label="Select Date"
            value={selectedDate} // Use the YYYY-MM-DD string state
            onChange={handleDateInputChange} // Use the corrected handler
            InputLabelProps={{ shrink: true }}
            inputProps={{
              min: minDate,
              max: maxDate,
            }}
          />
        </Box>
      </Box>

      {/* Customer Financials Display */}
      {/* Only show if a customer is selected */}
      {selectedCustomer && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(auto-fit, minmax(150px, 1fr))", // Responsive grid for financials
              md: "repeat(3, auto)", // Auto width for md and above
            },
            gap: 2, // Consistent gap
            justifyContent: "flex-start", // Align items to start
            mb: 2,
            alignItems: "center",
          }}
        >
          {/* FOR balance */}
          {balance !== null && ( // Only render if balance is not null
            <BigTextField
              label="BALANCE"
              type="string"
              value={balance}
              disabled
              onFocus={(e) => e.target.select()}
              InputLabelProps={{ shrink: true }}
              sx={{
                width: { xs: "100%", md: "150px" }, // Control width
                "& .Mui-disabled": {
                  fontWeight: "bold",
                  textAlign: "right",
                  WebkitTextFillColor: "black !important",
                },
              }}
            />
          )}

          {/* FOR OVERDUE */}
          {overDue !== null && ( // Only render if overdue is not null
            <BigTextField
              label="OVERDUE"
              type="string"
              disabled
              fullWidth
              value={overDue}
              InputLabelProps={{
                shrink: true,
                sx: {
                  color: "black !important", // label color
                  fontWeight: "bold !important", // bold label
                  backgroundColor: "white !important",
                  paddingRight: 2,
                  paddingLeft: "7px",
                  borderRadius: "4px",
                  fontSize: "1rem", // optional: change size
                },
              }}
              InputProps={{
                sx: {
                  "& input.Mui-disabled": {
                    WebkitTextFillColor:
                      overDue !== "0.00" ? "white" : "black !important", // Text color based on value
                    textAlign: "right",
                  },
                },
              }}
              sx={{
                width: { xs: "100%", md: "150px" }, // Control width
                "& .MuiOutlinedInput-root": {
                  backgroundColor: overDue !== "0.00" ? "red" : "transparent", // Background color based on value
                  "& fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined, // Border color
                  },
                  "&:hover fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: overDue !== "0.00" ? "red" : undefined,
                  },
                },
                "& .Mui-disabled": {
                  fontWeight: "bold",
                },
              }}
            />
          )}


          {/* Add Past Payment field here if needed */}
        </Box>
      )}
      {selectedCustomer && (
        <Box>
          <Button
            variant="contained"
            onClick={() => setOpen((prev) => !prev)}
            sx={{ mb: 2 }}
          >
            {open ? "Hide Order history" : "Show Order history"}
          </Button>
          <Collapse in={open}>
            <Box sx={{ backgroundColor: 'grey', color: 'black', padding: 1, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Jameel Noori Nastaleeq, serif', textAlign: 'right', fontSize: "3rem", fontWeight: 'bold', paddingX: 1 }}>
                :  آئٹم آرڈر کی آخری تاریخ
              </Typography>
              <InactiveItems acid={selectedCustomer?.acid} handleRowClick={handleRowClick} />
            </Box>
          </Collapse>
        </Box>
      )}

      <Paper
        sx={{ p: 2, mb: 3, opacity: loading || initialDataLoading ? 0.7 : 1 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
          <Typography variant="h6">
            Add Product
          </Typography>
          {/* for doc */}
          {selectedCustomer && ( // Only render if overdue is not null
            <Button
              variant="contained"
              sx={{
                height: '100%',
                fontSize: '1rem'
              }}
              onClick={handlePendingItems}
            >
              Pending Items
            </Button>
          )}
        </Box>

        <ProductSelectionForm
          product={selectedProduct}
          user={user}
          products={products}
          companies={companies}
          categories={categories}
          selectedCustomer={selectedCustomer}
          initialDataLoading={initialDataLoading}
          token={token}
          API_BASE_URL={url}
          onAddProduct={handleAddProduct}
          formatCurrency={formatCurrency}
          handleEnterkey={handleEnterkey}
        />


        {/* ORDER LIST (Preview) */}
        {orderItems.length > 0 && (
          <Box sx={{ marginY: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" gutterBottom>
                {" "}
                {/* Use h6 and gutterBottom for spacing */}
                Order Preview
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                size="small"
                onClick={() => {
                  setOrderItems([]); // Clear order items
                }}
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
              {" "}
              {/* Added max height and border */}
              {orderItems.map((item, index) => (
                <ListItem
                  key={`${item.productID}-${index}`} // Use a key that uniquely identifies the item instance
                  divider
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleRemoveProduct(index)}
                      disabled={loading}
                      size="small"
                    >
                      <CloseIcon sx={{ color: "red", fontWeight: "bold" }} />
                    </IconButton>
                  }
                  sx={{ py: 0.5, backgroundColor: item.status.toLowerCase().includes("short") ? "red" : "inherit", color: item.status.toLowerCase().includes('short') ? 'white' : 'black' }} // Highlight short items
                >
                  <ListItemText
                    primary={item.name}
                    secondary={`Qty: ${item.orderQuantity} (${item.quantity
                      } TQ) | Rate: ${Number(item.rate).toFixed(0) // Format rate for display
                      } | ${item.company} | ${item.model} | Amt: ${formatCurrency(
                        item.amount
                      )} | SchPc: ${item.schPc}
                    
                    `} // Include more details in secondary text
                    primaryTypographyProps={{
                      fontSize: { xs: ".9rem", sm: "1rem" }, // Adjust font size
                      fontWeight: "bold",
                      noWrap: true, // Prevent wrapping
                    }}
                    secondaryTypographyProps={{
                      fontSize: { xs: ".7rem", sm: ".8rem" }, // Adjust font size
                      color: "text.secondary",
                      noWrap: true, // Prevent wrapping
                    }}
                  />
                </ListItem>
              ))}
            </List>

            {/* Order Total Amount Display */}
            <Box sx={{ mt: 2, textAlign: "right" }}>
              <Typography variant="h6">
                {" "}
                {/* Use variant h6 */}
                <b>Total Items:</b> {orderItems.length}
              </Typography>
              <Typography variant="h5">
                {" "}
                {/* Use variant h5 for total */}
                <b>Total Amount: </b>{" "}
                {doc ? formatCurrency(totalAmount + perAmount) : formatCurrency(totalAmount)}{" "}
                {/* Display formatted total */}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Post Order Button */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePostOrder}
            disabled={
              loading || // Disable during loading/posting
              initialDataLoading || // Disable during initial data fetch
              orderItems.length === 0 || // Cannot post empty order
              !selectedCustomer // Must have a selected customer
            }
            sx={{ minWidth: "200px" }}
          >
            {loading ? ( // Show loader when 'loading' state is true (specifically for post order)
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Post Order"
            )}
          </Button>
        </Box>
        {/* print Order Button */}
        {/* <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePrint}
            disabled={
              loading || // Disable during loading/posting
              initialDataLoading || // Disable during initial data fetch
              orderItems.length === 0 || // Cannot post empty order
              !selectedCustomer // Must have a selected customermmmmmm                                                      
            }
            sx={{ minWidth: "200px" }}
          >
            {orderItems && // Show loader when 'loading' state is true (specifically for post order)
              "Print"}
          </Button>
        </Box> */}
      </Paper>
    </Container>
  );
};



export default OrderForm;