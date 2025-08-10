import React, { useState, useEffect, useRef, Suspense, } from "react";
const DataTable = React.lazy(() => import("./table"));
import { useParams, useLocation } from "react-router-dom";
import TextInput from "./Textfield";
import {
  Container,
  Typography,
  TextField,
  // TextInput,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Grid,
  Divider,
  Box,
  useTheme,
} from "@mui/material";

import { takeScreenShot } from "./fuctions";


import {
  AddCircleOutline,
  DeleteOutline,
  Print,
  SignalCellularNull,
} from "@mui/icons-material";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import axios from "axios";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2d3436",
    },
    secondary: {
      main: "#0984e3",
    },
  },
  typography: {
    fontFamily: "Poppins, Arial, sans-serif",
  },
});

const productDetail = [
  { label: "Product", size: 5, align: "left" },
  { label: "B.Q", size: 1 },
  { label: "FOC", size: 1 },
  // { label: "T.Q", size: 1 },
  { id: "R", label: "Rate", size: 1 },
  { label: "D%", size: 1 },
  { id: "A", label: "Amount", size: 1 },
];

const invoiceAPI = `${import.meta.env.VITE_API_URL}/invoices`;

const formatCurrency = (value) => {
  const num = Number(value);
  if (isNaN(num)) return "0"; // Returning "0" for NaN as requested
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// invoice model
const BillingComponent = ({ name = "INVOICE" }) => {
  const [invoice, setInvoice] = useState({ items: [] });
  const [formData, setFormData] = useState([]);
  const [customer, setCustomer] = useState([]);
  const [products, setProducts] = useState([]);
  const [formattedDate, setFormattedDate] = useState("");
  const buttonRef = useRef(null);
  const { id } = useParams();
  const [initialAmount, setInitialAmount] = useState(0);
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const location = useLocation();
  const cameFromOrderPage = location.state?.fromOrderPage === true;
  const targetRef = useRef();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const invoiceURL = location.pathname;

    if (!cameFromOrderPage || !targetRef.current || !invoiceURL) return;

    const key = `screenshot_taken_${invoiceURL}`;
    const alreadyTaken = sessionStorage.getItem(key);

    if (!alreadyTaken) {
      sessionStorage.setItem(key, "true"); // Mark as taken

      setTimeout(() => {

        takeScreenShot(targetRef);
      }, 1500);
    }

    // ✅ WhatsApp always opens regardless of screenshot status
    let phoneNumber

    if (customer?.Number) {
      const localNumber = String(customer.Number).trim();
      const raw = localNumber.startsWith("0")
        ? "92" + localNumber.slice(1)
        : localNumber;
      phoneNumber = raw.replace(/\D/g, "");
      console.log("number", phoneNumber)
    } else {
      console.warn("Customer number missing, using fallback.");
    }

    const message = encodeURIComponent("");
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappURL, "_blank");

  }, [cameFromOrderPage, isReady, location.pathname, customer]);



  useEffect(() => {
    const freight = customer?.Frieght || 0;
    const extra = customer?.Extra || 0;
    const invoiceAmount = customer?.InvoiceAmount || 0;
    const amount = invoiceAmount - freight + extra;

    if (extra || freight) {
      setInitialAmount(amount);
    } else {
      setInitialAmount(0);
    }
    console.log("Initial Amount:", amount);
  }, [invoice]);

  useEffect(() => {
    // console.log("getting the invoice");
    const getInvoice = async () => {
      console.time("getting the invoice with # ", id);
      const response = await axios.get(`${invoiceAPI}/${id}`, {
        params: { user: user.username, type: user.userType },
      });

      await setInvoice(response.data);
      await setCustomer(response.data.Customer);
      await setProducts(response.data.Products);
    };
    getInvoice();
  }, [id]);


  useEffect(() => {
    const now = new Date();
    const midnight = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0
    ); // Midnight tonight
    const timeUntilMidnight = midnight.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      const newCurrentDate = new Date(); // Get updated current date to prevent date going stale
      const newYear = newCurrentDate.getFullYear();
      const newMonth = String(newCurrentDate.getMonth() + 1).padStart(2, "0");
      const newDay = String(newCurrentDate.getDate()).padStart(2, "0");
      setFormattedDate(`${newYear}-${newMonth}-${newDay}`);
    }, timeUntilMidnight);

    return () => clearTimeout(timeoutId); // Cleanup the timeout on unmount
  }, []); // Empty dependency array means this only runs once

  // Define rows first (outside JSX)
  const rows = [
    ["Amount:", initialAmount],
    ["FREIGHT:", customer.Frieght],
    ["EXTRA:", customer.Extra],
    ["TOTAL AMOUNT:", customer.InvoiceAmount],
  ].filter(([label, value]) => label.toLowerCase().includes("total") ? value : value > 0); // Only include if value > 0

  return (
    <ThemeProvider theme={theme}>

      <Container
        disableGutters
        maxWidth={false}
        sx={{ overflowX: "hidden", p: 0, m: 0 }}
      >
        <Paper elevation={3} sx={{ px: 0, m: 0, width: "100%" }}>
          <Box
            ref={targetRef}
            sx={{ p: 1 }}
          >
            <Grid
              container
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0 }}
            >
              <Grid item sx={{ width: "15%" }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {name}
                </Typography>
                <Typography variant="subtitle2" color="text.secondary">
                  # {customer?.InvoiceNumber}
                  {!customer?.InvoiceNumber && (
                    <Skeleton height={30} width="90%" />
                  )}
                </Typography>
              </Grid>

              <Grid item xs={12} sx={{ width: { xs: "20%" } }}>
                <TextField
                  size="small"
                  label="Date"
                  InputLabelProps={{
                    shrink: true,
                    sx: {
                      backgroundColor: "white",
                    },
                  }}
                  value={
                    customer?.InvoiceDate
                      ? new Date(customer.InvoiceDate)
                        .toLocaleDateString("en-GB")
                        .replace(/\//g, "-")
                      : ""
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      border: "1px solid black",
                      borderRadius: "1rem",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none", // optional: remove double-border effect
                    },
                    outline: "none", // This has no visible effect here
                  }}
                />
              </Grid>
            </Grid>

            <Divider sx={{ mb: 1 }} />

            {/* Customer Details */}
            <Grid
              container
              spacing={1}
              justifyContent={"start"}
              display={"flex"}
              flexDirection={"row"}
              alignContent={"center"}
              sx={{ marginY: 4, width: "100%" }}
            >
              <Grid
                item
                xs={12}
                container
                justifyContent="space-between"
                alignItems="center"
                margin={"auto"}
              >
                <Typography
                  variant="h5"
                  alignSelf="center"
                >
                  <span style={{
                    padding: "0 20px",

                    fontSize: "3rem",
                    fontFamily: 'Jameel Noori Nastaleeq, serif',
                    fontWeight: "bold",
                  }}>
                    {customer?.CustomerName}
                  </span>
                  {!customer?.CustomerName && (
                    <Skeleton height={30} width="90%" />
                  )}
                </Typography>
              </Grid>
            </Grid>

            {/* Products List Table */}
            <Grid item xs={12} sx={{ marginTop: 3 }}>
              <Suspense
                fallback={
                  <Box p={2}>
                    <Skeleton height={30} width="90%" />
                    <Skeleton height={30} width="70%" />
                    <Skeleton height={30} width="80%" />
                  </Box>
                }
              >
                <DataTable
                  data={products ?? []} // Ensure items is always an array
                  onLoad={() => setIsReady(true)}
                  columns={productDetail.map((field) => ({
                    id: field.id,
                    label: field.label,
                    align: "center",
                    width:
                      field.label === "Product"
                        ? "25%"
                        : field.label === "FOC"
                          ? "2%"
                          : field.label === "Price"
                            ? "10%"
                            : field.label === "Amount"
                              ? "5%"
                              : "5%", // Reduced Amount column width to 8%
                    minWidth: field.label === "Product" ? 300 : "5%", // Adjusted minimum width for Product column
                    render: (value, row) => {
                      let displayValue = "";
                      if (!row) <Skeleton height={30} width="80%" />;
                      if (field.label === "Product") {
                        displayValue = ` ${row.Company?.toUpperCase() || ""} - ${row.Product?.toUpperCase() || "error"
                          }`;
                      } else if (field.label === "B.Q") {
                        displayValue = row.BQ || "0";
                      } else if (field.label === "FOC") {
                        displayValue = row.FOC || "0";
                      } else if (field.label === "T.Q") {
                        displayValue = row.TQ || "0";
                      } else if (field.id === "R") {
                        displayValue = row.Price || "0";
                      } else if (field.label === "D%") {
                        displayValue = row.Disc2 || "0";
                      } else if (field.id === "A") {
                        displayValue = formatCurrency(row.Amount) || "0";
                      }

                      return (
                        <TextField
                          variant="standard"
                          value={displayValue}
                          type={
                            ["Quantity", "Price", "Discount"].includes(
                              field.label
                            )
                              ? "number"
                              : "text"
                          }
                          InputProps={{
                            disableUnderline: true,
                          }}
                          inputProps={{
                            style: {
                              padding: field.label === "Product" ? "0px 5px" : "0px",
                              fontFamily: 'Jameel Noori Nastaleeq, serif',
                              fontWeight: "bold",
                              textAlign:
                                field.label === "Product" ? "right" : "center",
                              fontSize:
                                field.label === "Product" ? "1.3rem" : "1rem",
                              whiteSpace: "normal", // Enable text wrapping
                              wordWrap: "break-word", // Break long words
                            },
                          }}
                          sx={{
                            width: "100%",
                          }}
                        />
                      );
                    },
                  }))}
                  rowKey="id"
                  apiEndpoint="invoices"
                  sx={{
                    "& .MuiTableCell-root": {
                      border: "1px solid #ddd",
                      padding: ".25rem",
                      boxSizing: "border-box",
                    },
                    width: "100%",
                    // tableLayout: "fixed",
                  }}
                />
              </Suspense>
            </Grid>
            {/* Notes Section */}
            <TextField
              label="Description"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
              sx={{ marginY: 3 }}
              value={customer.Description}
              onChange={(e) =>
                setInvoice((prev) => ({
                  ...prev,
                  notes: e.target.value,
                }))
              }
            />

            {/* Totals and Notes */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                my: 1,
                pr: { xs: 1, xl: "65px" }, // shorthand for paddingRight
              }}
            >
              <Box
                sx={{
                  // border: "2px solid #ddd",
                  // borderRadius: 2,
                  p: 2,
                  minWidth: "300px",
                }}
              >
                {rows.map(([label, value], index, arr) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      mb: 1,
                      borderBottom:
                        index < rows.length ? "1px solid #ddd" : "none",
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {label}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {formatCurrency(value)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Print Button */}
            <Box textAlign="center" sx={{ mt: 4 }}>
              {/* <Button
              variant="contained"
              startIcon={<Print />}
              onClick={() => window.print()}
            >
              Print Invoice
            </Button> */}
              {/* <Button
              variant="contained"
              onClick={() => {
                handlePost();
              }}
              ref={buttonRef}
            >
              Submit
            </Button> */}
            </Box>

          </Box>
          {/* print Order Button */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={window.print}
              // disabled={
              //   loading || // Disable during loading/posting
              //   initialDataLoading || // Disable during initial data fetch
              //   orderItems.length === 0 || // Cannot post empty order
              //   !selectedCustomer // Must have a selected customer
              // }
              sx={{ minWidth: "200px" }}
            >
              Print
            </Button>
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
};

export default BillingComponent;
