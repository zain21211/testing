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
// import useLocation from "./hooks/geolocation"; // Removed unused hook
import { useLocalStorageState } from "./hooks/LocalStorage"; // Assuming this hook exists
import debounce from "lodash.debounce"; // Import debounce utility
import Storage from "use-local-storage-state";

import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  List,
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
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete"; // Added delete icon if needed later
import LedgerSearchForm from "./CustomerSearch.jsx"; // Assuming this component exists

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



const OrderForm = () => {
  console.log("OrderForm rendering or re-rendering");

  // --- State Variables ---
  const [products, setProducts] = useState([]);
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
  // const [isCustomer, setIsCustomer] = Storage('isCustomer', false); // Track if a customer is selected
  const [profit, setProfit] = useState(0);



  // STATES MANAGED IN OrderForm (and localStorage)
  // Use a specific key for the selected customer OBJECT
  const [selectedCustomer, setSelectedCustomer] = useLocalStorageState(
    "orderFormSelectedCustomer",
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

  const isCustomer = !!customerInput; // Check if a customer is selected based on acid
  const userType = user.userType.toLowerCase();
  const isAllowed = userType.includes("sm") || userType.includes("admin");

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
    const saleRate = selectedProduct?.SaleRate;
    setSuggestedPrice(saleRate);
    setPrice(saleRate);
    console.log("setting price to", saleRate);
  }, [selectedProduct]);


  useEffect(() => {
    console.log('price = ', price)
  }, [price])

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
  }, [orderQuantity, selectedProduct, price, discount1, discount2]); // Recalculate when these change

  // Effect to fetch initial product and company data
  useEffect(() => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      setInitialDataLoading(false);
      setLoading(false);
      return;
    }

    const fetchInitialData = async () => {
      console.log("Fetching initial data...");
      setInitialDataLoading(true);
      setError(null);
      setSuccess(null); // Clear success message on new load

      try {
        const headers = { Authorization: `Bearer ${token}` };
        // Fetch products, companies, and categories in parallel if separate endpoints exist
        // Or derive them from the products response if that's the case.
        // Assuming /products returns everything needed.
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
            ID: p.ID, // Use ID consistently
            code: p.code, // Ensure code is available for scheme lookups
            StockQty: p.StockQty ?? 0, // Ensure StockQty is available
          }))
          .filter((p) => p.ID != null && p.Name && p.Name.trim() !== ""); // Filter out invalid items

        setProducts(cleanedProducts);

        // COMPANIES: Derive from cleaned products
        const uniqueCompanies = [
          ...new Set(cleanedProducts.map((p) => p.Company).filter(Boolean)),
        ].sort();
        setCompanies(uniqueCompanies);

        // CATEGORIES: Derive from cleaned products
        const uniqueCategories = [
          ...new Set(cleanedProducts.map((p) => p.Category).filter(Boolean)),
        ].sort();
        setCategories(uniqueCategories);
      } catch (err) {
        console.error(
          "Error fetching initial data:",
          err.response?.data?.message || err.message || err
        );
        setError(
          `Failed to load initial data. ${err.response?.data?.message || err.message
          }`
        );
        setProducts([]);
        setCompanies([]);
        setCategories([]);
      } finally {
        setInitialDataLoading(false);
        setLoading(false);
        console.log("Finished fetching initial data.");
      }
    };

    fetchInitialData();
  }, [token, API_BASE_URL]); // Added dependencies

  useEffect(() => {
    const saleRate = Number(selectedProduct?.SaleRate) || 0;
    const totalUnits = (schPCS || 0) + (schOn || 0);

    if (totalUnits === 0) {
      setSchPrice(0); // Avoid divide-by-zero
      return;
    }

    const amount = (saleRate * (schOn || 0)) / totalUnits;

    console.log("schOn: ", schOn)
    console.log("schpcs: ", schPCS)
    console.log("scheme price", amount);
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

    console.log("filtered items: ", filtered)
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

  useEffect(() => {
    if (productID) {
      setProductID(null);
      setProductIDInput(null); // Update input when productID changes
    }
  }, [productInputValue]);

  useEffect(() => {
    if (selectedProduct && !productID) {
      // setProductID(selectedProduct.ID); // Set productID when a product is selected
      setProductIDInput(selectedProduct.ID); // Update input when a product is selected
    }
  }, [selectedProduct, productID]);

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

  const handleAddProduct = useCallback(() => {
    setError(null);
    setSuccess(null);

    // Input validation before adding
    if (!selectedCustomer || !selectedCustomer.acid) {
      setError("Please select a customer first.");
      console.error("Add product failed: No customer selected.");
      return;
    }
    if (!selectedProduct || !selectedProduct.ID) {
      setError("Please select a product from the list.");
      console.error(
        "Add product failed: No product selected or product has no ID."
      );
      return;
    }
    // Validate quantity
    if (!orderQuantity) {
      setError("Please specify a valid quantity (at least 1).");
      console.error("Add product failed: Invalid quantity.");
      return;
    }

    console.log("this si the profit ", profit);

    // Add the product to orderItems
    const newItem = {
      productID: selectedProduct.ID,
      customerID: selectedCustomer.acid, // Add customer ID to item for clarity/payload
      name: selectedProduct.Name,
      company: selectedProduct.Company,
      model: selectedProduct.Category,
      orderQuantity: Number(orderQuantity), // The quantity the user entered
      schPc: Number(schPc) || 0, // Calculated scheme pieces
      quantity: Number(quantity) || 0, // Total quantity (order + scheme)
      rate: Number(price) ?? 0, // Product's sale rate
      suggestedPrice: Number(suggestedPrice) || 0, // User's suggested price
      vest: Number(vest) || 0, // Calculated vest
      discount1: Number(discount1) || 0, // Discount 1 percentage
      discount2: Number(discount2) || 0, // Discount 2 percentage
      amount: Number(calculatedAmount) || 0, // Final calculated numeric amount for the item
      isClaim: isClaim,
      Sch: Sch,
      profit: profit,
      remakes: productRemakes.trim(), // Add remakes
    };

    setOrderItems((prev) => [...prev, newItem]);

    // Reset item-specific states after adding
    setSelectedProduct(null);
    setOrderQuantity(0);
    setSchPc(0);
    setQuantity(0); // Reset derived quantity
    setDiscount1(0); // Reset discounts (unless they apply per customer/company consistently?)
    setDiscount2(0); // Reset discounts
    setPrice(0); // Reset price
    setSuggestedPrice(0); // Reset suggested price
    setVest(0); // Reset vest
    setCalculatedAmount(0); // Reset amount
    setIsClaim(false); // Reset claim checkbox
    setSch(true); // Reset scheme checkbox
    setProductRemakes(""); // Reset remakes
    setProductID(null); // ✅ Add this
    setProductIDInput(null);
    setProductInputValue("")
    // Maybe refocus product input after adding
    // Using a timeout because state updates might cause re-renders that steal focus
    setTimeout(() => {
      if (user.userType.toLowerCase().includes("sm"))
        productIDInputRef.current?.focus();
      else
        productInputRef.current?.focus();
    }, 50);
  }, [
    selectedCustomer,
    selectedProduct,
    setProductInputValue,
    orderQuantity,
    orderItems,
    schPc,
    productID,
    productIDInput,
    quantity,
    discount1,
    discount2,
    price,
    suggestedPrice,
    vest,
    calculatedAmount,
    isClaim,
    Sch,
    profit,
    productRemakes,
    selectedProduct?.StockQty,
  ]); // Added dependencies


  // useEffect(() => {
  //   if(productIDInput?.length === 1 || productID?.length === 1) {
  //     setCompanyFilter("");
  //     setCategoryFilter("");
  //   }
  // }, [productID, productIDInput]);

  const handleRemoveProduct = useCallback((indexToRemove) => {
    console.log("handleRemoveProduct at index:", indexToRemove);
    setOrderItems((prev) => prev.filter((_, i) => i !== indexToRemove));
  }, []); // No dependencies needed

  const handlePostOrder = async () => {
    setError(null); // Clear previous errors
    setSuccess(null); // Clear previous success messages

    // Final validation before posting
    if (!selectedCustomer || !selectedCustomer.acid) {
      setError("Please select a customer before posting the order.");
      console.error("Post order failed: No customer selected.");
      return;
    }

    if (orderItems.length === 0) {
      setError("Cannot post an empty order. Please add at least one product.");
      console.error("Post order failed: No items in order.");
      return;
    }

    setLoading(true); // Set general loading for this operation

    orderItems.map((item) => {
      console.log("this the item profit ", item.profit);
    });
    try {
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

      console.log("Posting order with payload:", payload);

      const response = await axios.post(
        `${API_BASE_URL}/create-order`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const { updatedProducts, invoiceNumber } = response.data

      const path = `/invoice/${invoiceNumber}`
      navigate(path, {
        state: { fromOrderPage: true },
      });
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
      sx={{
        "@media (max-width:600px)": {
          all: "unset",
        },
      }}
      maxWidth="xl" // Use max width from MUI
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

          {/* for doc */}
          {selectedCustomer && ( // Only render if overdue is not null
            <Button
              variant="contained"
              sx={{
                height: '100%',
                fontSize: '1.1rem'
              }}
              onClick={handlePendingItems}
            >
              Pending Items
            </Button>


          )}
          {/* Add Past Payment field here if needed */}
        </Box>
      )}

      <Paper
        sx={{ p: 2, mb: 3, opacity: loading || initialDataLoading ? 0.7 : 1 }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          Add Products
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(4, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(auto-fit, minmax(130px, 1fr))", // INCREASED min width
              lg: "repeat(11, auto)",
            },
            gap: 3, // INCREASED gap
            mb: 2,
            alignItems: "center",
            p: { xs: 1, sm: 2 }, // ADDED padding
          }}
        >
          <Box
            sx={{
              gridColumn: { xs: "span 4", sm: "span 2" },
              minWidth: { xs: "100%", sm: "480px", md: "520px" }, // INCREASED minWidth
              display: "grid",
              gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(3, 1fr)" },
              gap: 2.5, // INCREASED internal gap
            }}
          >
            {/* {for product id} */}
            <TextField
              label="Product ID"
              variant="outlined"
              inputRef={productIDInputRef}
              value={productIDInput ?? ""}
              sx={{
                gridColumn: "span 1",
                width: "100%",
                '& .MuiInputBase-input': { fontSize: biggerInputTextSize },
                '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
              }}
              onFocus={(e) => e.target.select()}
              inputProps={{ inputMode: "numeric" }}
              onChange={(e) => {
                const value = e.target.value;
                setProductIDInput(value);
                if (!value) {
                  setSelectedProduct(null);
                  setProductID(null);
                }
                setTimeout(() => {
                  quantityInputRef.current?.focus();
                }, 2050);
              }}
            />

            {/* FOR COMPANY */}
            <Autocomplete
              freeSolo
              options={companies || []}
              inputRef={companyInputRef} // Note: Autocomplete uses `inputRef` on `renderInput`'s TextField or directly.
              // If `companyInputRef` is for the Autocomplete itself, it's fine. If for the input field,
              // it should be passed to `renderInput`'s TextField.
              onFocus={(e) => e.target.select()}
              getOptionLabel={(option) => option || ""}
              value={companyFilter}
              inputValue={companyInputValue}
              onInputChange={(event, newInputValue, reason) => {
                setCompanyInputValue(newInputValue);
                if (reason === "input") {
                  debouncedSetCompanyFilter(newInputValue);
                } else if (reason === "clear") {
                  debouncedSetCompanyFilter("");
                  setCompanyInputValue("");
                }
              }}
              onChange={(event, newValue) => {
                setCompanyFilter(newValue || "");
                setCompanyInputValue(newValue || "");
                setSelectedProduct(null);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={companyInputRef} // Correct place for inputRef for the text field
                  label="Company"
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-input': { fontSize: biggerInputTextSize },
                    '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
                  }}
                />
              )}
              sx={{ gridColumn: { xs: "span 1", sm: "span 1", md: "auto" } }}
              disabled={loading || initialDataLoading}
              loading={initialDataLoading && !companies.length}
            />

            {/* FOR MODEL (Category) */}
            <Autocomplete
              freeSolo
              options={categories || []}
              getOptionLabel={(option) => option || ""}
              value={categoryFilter}
              inputValue={categoryInputValue}
              onFocus={(e) => e.target.select()}
              onInputChange={(event, newInputValue, reason) => {
                setCategoryInputValue(newInputValue);
                if (reason === "input") {
                  debouncedSetCategoryFilter(newInputValue);
                } else if (reason === "clear") {
                  debouncedSetCategoryFilter("");
                  setCategoryInputValue("");
                }
              }}
              onChange={(event, newValue) => {
                setCategoryFilter(newValue || "");
                setCategoryInputValue(newValue || "");
                setSelectedProduct(null);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Model"
                  variant="outlined"
                  sx={{
                    '& .MuiInputBase-input': { fontSize: biggerInputTextSize },
                    '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
                  }}
                />
              )}
              sx={{ gridColumn: { xs: "span 1", sm: "span 1", md: "auto" } }}
              disabled={loading || initialDataLoading}
              loading={initialDataLoading && !categories.length}
            />
          </Box>

          {/* Scheme/Claim Checkboxes - Grouped */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              minWidth: "120px", // INCREASED minWidth
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={Sch}
                  onChange={(e) => handleCheckBox(e, "sch")}
                  name="sch"
                />
              }
              label="Scheme"
              labelTypographyProps={{ sx: { fontSize: biggerCheckboxLabelSize } }} // INCREASED
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isClaim}
                  onChange={(e) => handleCheckBox(e, "isClaim")}
                  name="isClaim"
                />
              }
              label="Claim"
              labelTypographyProps={{ sx: { fontSize: biggerCheckboxLabelSize } }} // INCREASED
            />
          </Box>

          {/* FOR PRODUCT */}
          <Autocomplete
            freeSolo
            options={
              productInputValue.length < 2 ? [] : filteredAutocompleteOptions
            }
            getOptionLabel={(option) => option?.Name || ""}
            filterOptions={(x) => x}
            isOptionEqualToValue={(option, value) => option?.ID === value?.ID}
            inputValue={productInputValue}
            value={selectedProduct}
            onInputChange={(event, newInputValue) => {
              setProductInputValue(newInputValue);
              if (selectedProduct && selectedProduct.Name !== newInputValue) {
                setSelectedProduct(null);
              }
            }}
            onChange={(event, newValue) => {
              setSelectedProduct(newValue);
              setProductInputValue(newValue?.Name || "");
              setOrderQuantity(0);
              setError(null);
              setTimeout(() => {
                quantityInputRef.current?.focus();
              }, 100);
            }}
            renderOption={(props, option, state) => {
              return (
                <Box component="li" {...props} key={option.ID}>
                  <ListItemText
                    sx={{ borderBottom: "1px solid #eee" }}
                    primary={option.Name}
                    secondary={
                      <>
                        Rate: {option.SaleRate != null ? option.SaleRate.toFixed(0) : "N/A"}
                        {" | Co: "}{option.Company || "-"}
                        {" | "}
                        <span style={{fontWeight: 'bold', color:'black'}}>MODEL: {option.Category || "-"}</span>
                      </>
                    }
                    primaryTypographyProps={{ noWrap: true, fontSize: '0.95rem' }} // ADJUSTED
                    secondaryTypographyProps={{ noWrap: true, fontSize: '0.8rem' }} // ADJUSTED
                  />
                </Box>
              );
            }}
            slotProps={{
              popper: {
                sx: { minWidth: 350, width: "auto !important" },
              },
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Select Product"
                variant="outlined"
                inputRef={productInputRef}
                InputProps={{
                  ...params.InputProps,
                  sx: {
                    ...params.InputProps.sx,
                    color: isClaim ? "white" : undefined,
                    backgroundColor: isClaim ? "red" : undefined,
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: isClaim ? "red !important" : undefined,
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: isClaim ? "darkred !important" : undefined,
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: isClaim ? "darkred !important" : undefined,
                    },
                    // Apply font size to the input element itself
                    '& .MuiInputBase-input': { fontSize: biggerInputTextSize },
                  },
                }}
                InputLabelProps={{
                  ...params.InputLabelProps,
                  sx: {
                    ...params.InputLabelProps?.sx,
                    color: isClaim ? "white" : undefined,
                    // Apply font size to the label when shrunk
                    '&.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
                  },
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === "Tab") && !selectedProduct) {
                    if (filteredAutocompleteOptions.length > 0 && filteredAutocompleteOptions[0]?.ID != null) {
                      setSelectedProduct(filteredAutocompleteOptions[0]);
                      setProductInputValue(filteredAutocompleteOptions[0].Name || "");
                      e.preventDefault();
                    }
                  } else if ((e.key === "Enter" || e.key === "Tab") && selectedProduct) {
                    e.preventDefault();
                    quantityInputRef.current?.focus();
                  }
                }}
              />
            )}
            sx={{ gridColumn: { xs: "span 3", sm: "span 3", md: "span 2" } }}
            disabled={loading || initialDataLoading}
            loading={initialDataLoading && !products.length}
            noOptionsText={getNoOptionsText()}
          />

          {/* FOR PRODUCT URDU NAME */}
          {selectedProduct && (
            <TextField
              value={` ${selectedProduct?.Company} - ${selectedProduct?.Category} | ${selectedProduct?.UrduName}`}
              fullWidth
              disabled
              sx={{
                gridColumn: { xs: "span 4", sm: "span 2", md: "span 4" },
                "& .MuiInputBase-root.Mui-disabled": {
                  fontWeight: "bold",
                  fontFamily: 'Jameel Noori Nastaleeq, serif',
                  color: "black",
                  fontSize: { xs: "1.1rem", sm: "1.7rem" }, // ADJUSTED for slightly bigger feel
                },
                "& .MuiInputBase-input.Mui-disabled": {
                  fontWeight: "bold",
                  color: "black",
                  textAlign: "center",
                  WebkitTextFillColor: "black !important",
                  fontSize: { xs: "2.1rem", sm: "1.7rem" }, // ADJUSTED for slightly bigger feel
                },
              }}
            />
          )}

          {/* FOR orderQty (Ordered Quantity) */}
          <TextField
            label="Qty"
            type="number"
            value={orderQuantity || ""}
            inputRef={quantityInputRef}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => handleEnterkey(e)}
            onChange={(e) => {
              const value = e.target.value;
              if (value === "" || value === "-") {
                setOrderQuantity(value);
              } else {
                const parsed = parseInt(value, 10);
                if (!isNaN(parsed)) setOrderQuantity(parsed);
              }
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: !isClaim && selectedProduct ? (hasStock ? "green" : "red") : undefined,
                },
                "&:hover fieldset": {
                  borderColor: !isClaim && selectedProduct ? (hasStock ? "darkgreen" : "darkred") : undefined,
                },
                "&.Mui-focused fieldset": {
                  borderColor: !isClaim && selectedProduct ? (hasStock ? "darkgreen" : "darkred") : undefined,
                },
              },
              "& .MuiInputBase-input": { // Target input directly
                color: "black !important",
                textAlign: "center",
                fontSize: biggerInputTextSize,
              },
              '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
            }}
            disabled={loading || initialDataLoading || !selectedProduct}
          />

          {/* FOR FOC (Scheme Pieces) */}
          <TextField
            label="FOC"
            type="number"
            disabled
            value={Math.round(schPc) || 0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input.Mui-disabled": {
                textAlign: "center",
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
                fontSize: biggerInputTextSize,
              },
              "& .MuiInputLabel-root.Mui-disabled": {
                fontSize: biggerShrunkLabelSize,
                color: "rgba(0, 0, 0, 0.6)" // Default disabled label color
              },
            }}
          />

          {/* FOR QUANTITY (Total Quantity Qty + FOC) */}
          <TextField
            label="TQ"
            type="number"
            disabled
            value={Math.round(quantity) || 0}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input.Mui-disabled": {
                textAlign: "center",
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
                fontSize: biggerInputTextSize,
              },
              "& .MuiInputLabel-root.Mui-disabled": {
                fontSize: biggerShrunkLabelSize,
                color: "rgba(0, 0, 0, 0.6)"
              },
            }}
          />

          {/* FOR scheme list */}
          <TextField
            label="Scheme"
            type="text"
            disabled
            value={`${scheme} (${schPrice || 0})`}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 2", md: "auto" },
              width: { xs: "100%", md: "180px" }, // INCREASED width
              "& .MuiInputBase-root.Mui-disabled": {
                color: "black",
                fontWeight: "bold",
                backgroundColor: "transparent",
              },
              "& .MuiInputBase-input.Mui-disabled": {
                WebkitTextFillColor: "black !important",
                fontSize: biggerInputTextSize,
              },
              "& .MuiInputLabel-root.Mui-disabled": {
                color: "black",
                fontSize: biggerShrunkLabelSize,
              },
            }}
          />

          {/* FOR PRICE */}
          <TextField
            label="Price"
            type="number"
            disabled={!isAllowed}
            value={Number(price)?.toFixed(0) || 0}
            onFocus={(e) => e.target.select()}
            onChange={(e) => { setPrice(e.target.value); }}
            InputProps={{
              inputProps: { style: { textAlign: "right", fontWeight: "bold" } }, // Keep specific styles
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input": { fontSize: biggerInputTextSize },
              "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: "black !important" },
              '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
              "& .MuiInputLabel-root.Mui-disabled": { fontSize: biggerShrunkLabelSize }
            }}
          />

          {/* FOR suggested PRICE */}
          <TextField
            label="Sug.price"
            type="number"
            value={suggestedPrice || ""}
            onChange={(e) => {
              const value = parseInt(e.target.value, 10);
              setSuggestedPrice(Math.max(0, value || 0));
            }}
            InputProps={{
              inputProps: { style: { textAlign: "right", fontWeight: "bold", min: 0 } }, // Keep specific styles
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input": { fontSize: biggerInputTextSize },
              '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
            }}
            disabled={loading || initialDataLoading || !selectedProduct}
            onFocus={(e) => e.target.select()}
          />

          {/* FOR DISCOUNT1 */}
          <TextField
            label="D1 (%)"
            type="number"
            disabled={!(selectedCustomer?.acid === 1438 || selectedCustomer?.acid === 1441)}
            value={discount1 || 0}
            inputProps={{ max: 12, min: 0 }} // These go directly to inputProps
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value + discount2 <= 12) setDiscount1(value);
            }}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input": { textAlign: "right", fontSize: biggerInputTextSize },
              "& .MuiInputBase-input.Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
                // fontSize will be inherited from above or can be set explicitly
              },
              '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
              "& .MuiInputLabel-root.Mui-disabled": { fontSize: biggerShrunkLabelSize }
            }}
          />

          {/* FOR DISCOUNT2 */}
          <TextField
            label="D2 (%)"
            type="number"
            value={discount2 || 0}
            inputProps={{ max: 12, min: 0 }}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (value + discount1 <= 12) setDiscount2(value);
            }}
            disabled={!(selectedCustomer?.acid === 1438)}
            sx={{
              gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
              width: { xs: "100%", md: "120px" }, // INCREASED width
              "& .MuiInputBase-input": { textAlign: "right", fontSize: biggerInputTextSize },
              "& .MuiInputBase-input.Mui-disabled": {
                fontWeight: "bold",
                WebkitTextFillColor: "black !important",
              },
              '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
              "& .MuiInputLabel-root.Mui-disabled": { fontSize: biggerShrunkLabelSize }
            }}
          />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(3, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
              alignItems: "center",
              gridColumn: { xs: "span 4", sm: "span 3", md: "span 4" },
            }}
          >
            {/* FOR AMOUNT (Calculated Item Amount) */}
            <TextField
              label="Amount"
              type="text"
              disabled
              value={formatCurrency(calculatedAmount)}
              InputProps={{
                inputProps: { style: { textAlign: "right" } }, // Keep specific style
              }}
              sx={{
                gridColumn: { xs: "span 1", sm: "span 2", md: "auto" },
                width: { xs: "100%", md: "180px" }, // INCREASED width
                "& .MuiInputBase-input.Mui-disabled": {
                  fontWeight: "bold",
                  fontSize: "1.4rem", // Adjusted for bigger feel
                  WebkitTextFillColor: "black !important",
                },
                "& .MuiInputLabel-root.Mui-disabled": {
                  fontSize: biggerShrunkLabelSize, // Make label consistent
                  color: "rgba(0, 0, 0, 0.6)"
                },
              }}
            />

            {/* FOR REMAKES (Product Specific Remakes) */}
            <TextField
              label="Remakes"
              type="text"
              value={productRemakes}
              onChange={(e) => setProductRemakes(e.target.value)}
              sx={{
                gridColumn: { xs: "span 2", sm: "span 2", md: "auto" },
                width: { xs: "100%", md: "240px" }, // INCREASED width
                "& .MuiInputBase-input": { fontSize: biggerInputTextSize },
                '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: biggerShrunkLabelSize },
              }}
              disabled={loading || initialDataLoading || !selectedProduct}
            />
          </Box>

          {/* for STOCK - Conditional Rendering */}
          {(user?.userType?.toLowerCase() === "admin" ||
            user?.username?.toLowerCase() === "zain") && (
              <TextField
                label="Stock"
                type="number"
                disabled
                value={selectedProduct?.StockQty ?? 0}
                sx={{
                  gridColumn: { xs: "span 1", sm: "span 1", md: "auto" },
                  width: { xs: "100%", md: "120px" }, // INCREASED width
                  "& .MuiInputBase-root.Mui-disabled": {
                    backgroundColor: "#f0f0f0",
                    color: "black",
                    // fontWeight is in MuiInputBase-input.Mui-disabled
                  },
                  "& .MuiInputBase-input.Mui-disabled": {
                    fontWeight: "bold",
                    WebkitTextFillColor: "black !important",
                    fontSize: biggerInputTextSize,
                  },
                  "& .MuiInputLabel-root.Mui-disabled": {
                    color: "#888",
                    fontSize: biggerShrunkLabelSize,
                  },
                }}
              />
            )}

          {/* Add Product Button */}
          <Button
            variant="contained"
            onClick={handleAddProduct}
            startIcon={<AddIcon />}
            disabled={
              loading ||
              initialDataLoading ||
              !selectedProduct ||
              !orderQuantity ||
              !selectedCustomer
            }
            sx={{
              height: "56px", // Match TextField height or adjust with padding e.g. py: 1.5
              gridColumn: { xs: "1 / -1", sm: "span 1", md: "auto" },
              alignSelf: "start",
              fontSize: '0.95rem', // INCREASED button text
            }}
          >
            Add
          </Button>
        </Box>


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
                  sx={{ py: 0.5 }}
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
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handlePrint}
            disabled={
              loading || // Disable during loading/posting
              initialDataLoading || // Disable during initial data fetch
              orderItems.length === 0 || // Cannot post empty order
              !selectedCustomer // Must have a selected customer
            }
            sx={{ minWidth: "200px" }}
          >
            {orderItems && // Show loader when 'loading' state is true (specifically for post order)
              "Print"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};



export default OrderForm;
