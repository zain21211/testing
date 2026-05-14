import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Stack,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PrintIcon from "@mui/icons-material/Print";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";

const url = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [actualValues, setActualValues] = useState({}); // { key: value }
  const [processedLoadValues, setProcessedLoadValues] = useState({}); // { key: value }

  const getProductsHistory = async (date) => {
    try {
      const res = await axios.get(`${url}/products/history`, {
        params: { date: date || selectedDate }
      });
      const data = res.data?.data;
      if (data && Array.isArray(data) && JSON.stringify(data) !== JSON.stringify(products)) {
        setProducts(data);
        
        // Populate actual and processed load values from database
        const actuals = {};
        const loads = {};
        data.forEach(p => {
          const key = getRowKey(p);
          if (p.actual_qty !== null && p.actual_qty !== undefined) {
            actuals[key] = p.actual_qty;
          }
          if (p.processed_load_qty !== null && p.processed_load_qty !== undefined) {
            loads[key] = p.processed_load_qty;
          }
        });
        setActualValues(actuals);
        setProcessedLoadValues(loads);
      } else if (!data || !Array.isArray(data)) {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setProducts([]); 
    }
  };

  useEffect(() => {
    getProductsHistory();
    const interval = setInterval(() => getProductsHistory(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const getRowKey = (product) => `${selectedDate}|${product.company}|${product.urduname}|${product.category}`;

  const saveActualQty = async (product, qty, loadQty) => {
    try {
      await axios.post(`${url}/products/actual`, {
        date: selectedDate,
        company: product.company,
        urduname: product.urduname,
        category: product.category,
        qty: qty || 0,
        loadQty: loadQty || 0
      });
    } catch (err) {
      console.error("Failed to save actual quantity:", err);
    }
  };

  const toggleRow = (product) => {
    const key = getRowKey(product);
    const currentActual = actualValues[key] || 0;
    const isActivating = currentActual === 0;
    
    const newVal = isActivating ? product.qty : 0;
    // When activating, we capture the CURRENT load quantity
    const newLoadQty = isActivating ? product.qty : 0;

    setActualValues(p => ({ ...p, [key]: newVal }));
    setProcessedLoadValues(p => ({ ...p, [key]: newLoadQty }));
    saveActualQty(product, newVal, newLoadQty);
  };

  const handleActualChange = (product, val) => {
    const key = getRowKey(product);
    const numVal = parseInt(val) || 0;
    setActualValues(prev => ({ ...prev, [key]: val }));
    // Manual typing also captures/updates the load quantity it was based on
    setProcessedLoadValues(prev => ({ ...prev, [key]: product.qty }));
    saveActualQty(product, numVal, product.qty);
  };

  const formatDisplayDate = (dateStr) => {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        py: 4,
        px: { xs: 1, md: 3 },
      }}
    >
      <Box
        sx={{
          maxWidth: "1000px",
          margin: "auto",
          background: "rgba(255, 255, 255, 0.03)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.8)",
          overflow: "hidden",
          "@media print": {
            background: "white",
            boxShadow: "none",
            border: "none",
            p: 0,
            m: 0,
            maxWidth: "none",
          },
        }}
      >
        {/* Sticky Date Filter */}
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            background: "rgba(30, 27, 75, 0.95)",
            backdropFilter: "blur(10px)",
            p: 2,
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
            "@media print": { display: "none" },
          }}
        >
          <Typography sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 600, fontSize: "0.9rem" }}>
            Viewing Data For:
          </Typography>
          <Box
            sx={{
              position: "relative",
              background: "rgba(108, 99, 255, 0.2)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              border: "1px solid rgba(108, 99, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              "&:hover": { background: "rgba(108, 99, 255, 0.3)" }
            }}
          >
            <Typography sx={{ color: "white", fontWeight: 900, fontSize: "1.1rem" }}>
              {formatDisplayDate(selectedDate)}
            </Typography>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                opacity: 0,
                cursor: "pointer"
              }}
            />
          </Box>
        </Box>

        {/* Header */}
        <Box
          sx={{
            p: 3,
            background: "rgba(255, 255, 255, 0.05)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            "@media print": { display: "none" },
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ color: "white", fontWeight: 900, letterSpacing: "-1px" }}>
              Spot Sale Items
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
              Summarized product distribution for {formatDisplayDate(selectedDate)}
            </Typography>
          </Box>
          <Tooltip title="Print List">
            <IconButton
              onClick={() => window.print()}
              sx={{
                bgcolor: "#6c63ff",
                color: "white",
                "&:hover": { bgcolor: "#5b54d6" },
                p: 2,
              }}
            >
              <PrintIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* List Content */}
        <Box sx={{ p: { xs: 1, md: 3 } }}>
          <Stack spacing={2}>
            {products.length === 0 && (
              <Typography sx={{ color: "rgba(255,255,255,0.3)", textAlign: "center", py: 8 }}>
                No products recorded for {formatDisplayDate(selectedDate)}.
              </Typography>
            )}
            
            {products.map((product, index) => {
              const key = getRowKey(product);
              const actualVal = actualValues[key] || 0;
              const processedLoadVal = processedLoadValues[key] || 0;
              const isBlackedOut = actualVal > 0;
              
              // Blue Alert Logic: 
              // If blacked out AND the database Load Qty is different from what was processed
              const isChanged = isBlackedOut && processedLoadVal > 0 && Number(processedLoadVal) !== product.qty;

              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    background: isChanged 
                      ? "rgba(25, 118, 210, 0.4)" 
                      : isBlackedOut 
                        ? "#000" 
                        : "rgba(255, 255, 255, 0.03)",
                    opacity: isBlackedOut ? 0.6 : 1, 
                    borderRadius: "16px",
                    transition: "all 0.3s ease",
                    border: isChanged 
                      ? "2px solid #1976d2" 
                      : "1px solid rgba(255, 255, 255, 0.05)",
                    boxShadow: isChanged ? "0 0 15px rgba(25, 118, 210, 0.3)" : "none",
                    "&:hover": {
                      background: isChanged 
                        ? "rgba(25, 118, 210, 0.6)"
                        : isBlackedOut 
                          ? "#000" 
                          : "rgba(255, 255, 255, 0.07)",
                      transform: isBlackedOut ? "none" : "translateX(8px)",
                      borderColor: isChanged ? "#1976d2" : isBlackedOut ? "none" : "rgba(108, 99, 255, 0.3)",
                    },
                    "@media print": {
                      display: isBlackedOut ? "none" : "flex",
                      flexDirection: "row",
                      p: 1,
                      borderBottom: "1px dashed #ccc",
                      borderRadius: 0,
                      background: "none",
                      transform: "none",
                      color: "black",
                    },
                  }}
                >
                  {/* 0. Actual Qty Textbox */}
                  <Box
                    sx={{
                      mr: 2,
                      "@media print": { display: "none" }
                    }}
                  >
                    <input
                      type="number"
                      value={actualVal || ""}
                      onChange={(e) => handleActualChange(product, e.target.value)}
                      placeholder="Qty"
                      style={{
                        width: "60px",
                        height: "40px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "8px",
                        color: "white",
                        textAlign: "center",
                        fontSize: "1.1rem",
                        fontWeight: "bold",
                        outline: "none",
                      }}
                    />
                  </Box>

                  {/* 1. Total Qty Badge */}
                  <Box
                    onClick={() => toggleRow(product)}
                    sx={{
                      minWidth: { xs: "60px", md: "80px" },
                      height: { xs: "50px", md: "60px" },
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isChanged
                        ? "#1976d2" 
                        : isBlackedOut 
                          ? "#333" 
                          : "linear-gradient(135deg, #6c63ff 0%, #3f37c9 100%)",
                      borderRadius: "12px",
                      color: "white",
                      mr: 4,
                      cursor: "pointer",
                      boxShadow: isBlackedOut ? "none" : "0 4px 12px rgba(108, 99, 255, 0.4)",
                      flexShrink: 0,
                      animation: isChanged ? "pulse 2s infinite" : "none",
                      "@keyframes pulse": {
                        "0%": { boxShadow: "0 0 0 0px rgba(25, 118, 210, 0.7)" },
                        "70%": { boxShadow: "0 0 0 10px rgba(25, 118, 210, 0)" },
                        "100%": { boxShadow: "0 0 0 0px rgba(25, 118, 210, 0)" },
                      },
                      "&:hover": { transform: "scale(1.05)" },
                      "@media print": {
                        mr: 2,
                        background: "none",
                        border: "2px solid black",
                        color: "black",
                        boxShadow: "none",
                      },
                    }}
                  >
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>
                      {product.qty}
                    </Typography>
                  </Box>

                  {/* 2. Unified Information String */}
                  <Box sx={{ flexGrow: 1, minWidth: 0, overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
                    <Typography
                      sx={{
                        fontSize: { xs: "1.4rem", md: "2.6rem" },
                        fontFamily: "'Jameel Noori Nastaleeq', serif",
                        color: "white",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textShadow: isBlackedOut ? "none" : "0 2px 10px rgba(0,0,0,0.3)",
                        "@media print": { color: "black", fontSize: "1.8rem", textShadow: "none" },
                      }}
                    >
                      <span>{product.category || "General"}</span>
                      <span dir="rtl" style={{ margin: '0 15px' }}>{product.urduname}</span>
                      <span>{product.company || "N/A"}</span>
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        {/* Footer info */}
        <Box sx={{ p: 3, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: "0.75rem", "@media print": { color: "black", mt: 2 } }}>
          Generated for {formatDisplayDate(selectedDate)} on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </Box>
      </Box>
    </Box>
  );
}
