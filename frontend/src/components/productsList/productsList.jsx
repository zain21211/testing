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
import { isEqual } from "lodash";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PrintIcon from "@mui/icons-material/Print";
import CategoryIcon from "@mui/icons-material/Category";
import BusinessIcon from "@mui/icons-material/Business";

const url = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [blackedOutRows, setBlackedOutRows] = useState(() => {
    try {
      const saved = localStorage.getItem("blackedOutRows_products");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    getProductsHistory();
  }, []);

  const getProductsHistory = async () => {
    try {
      const res = await axios.get(`${url}/products/history`);
      const data = res.data.data;
      if (!isEqual(data, products)) {
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  const getRowKey = (product) => `${product.company}|${product.urduname}|${product.category}`;

  const toggleRow = (product) => {
    const key = getRowKey(product);
    setBlackedOutRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      
      // Persist to localStorage
      localStorage.setItem("blackedOutRows_products", JSON.stringify(Array.from(newSet)));
      return newSet;
    });
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
              Daily Product Load
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
              Today's summarized product distribution and quantities
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
                No products recorded for today yet.
              </Typography>
            )}
            
            {products.map((product, index) => {
              const key = getRowKey(product);
              const isBlackedOut = blackedOutRows.has(key);
              return (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    p: 2,
                    background: isBlackedOut ? "#000" : "rgba(255, 255, 255, 0.03)",
                    opacity: isBlackedOut ? 0.3 : 1,
                    borderRadius: "16px",
                    transition: "all 0.3s ease",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    "&:hover": {
                      background: isBlackedOut ? "#000" : "rgba(255, 255, 255, 0.07)",
                      transform: isBlackedOut ? "none" : "translateX(8px)",
                      borderColor: isBlackedOut ? "none" : "rgba(108, 99, 255, 0.3)",
                    },
                    "@media print": {
                      display: isBlackedOut ? "none" : "flex", // Hide blacked out rows in print
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
                  {/* 1. Total Qty (Most Left) */}
                  <Box
                    onClick={() => toggleRow(product)}
                    sx={{
                      minWidth: { xs: "60px", md: "80px" },
                      height: { xs: "50px", md: "60px" },
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isBlackedOut ? "#333" : "linear-gradient(135deg, #6c63ff 0%, #3f37c9 100%)",
                      borderRadius: "12px",
                      color: "white",
                      mr: 4,
                      cursor: "pointer",
                      boxShadow: isBlackedOut ? "none" : "0 4px 12px rgba(108, 99, 255, 0.4)",
                      flexShrink: 0,
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

                  {/* 2. Unified Information String (Category UrduName Company) */}
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
          Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </Box>
      </Box>
    </Box>
  );
}
