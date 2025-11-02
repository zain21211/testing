import React, { useState, useEffect } from "react";
import axios from "axios";
import {
    Avatar,
    Box,
    Divider,
    List,
    ListItem,
    Stack,
    Typography,
} from "@mui/material";
import { isEqual } from "lodash";

const url = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ProductsList() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        getProductsHistory();
    }, []);

    const getProductsHistory = async () => {
        const res = await axios.get(`${url}/products/history`);
        const data = res.data.data;

        if (!isEqual(data, products)) {
            setProducts(data);
            console.log(data);
        }
    };

    return (
        <Box
            id="products-list"
            sx={{
                bgcolor: "#d9dbe0ff",
                borderRadius: 2,
                p: 2,
                width: { xs: "90%", sm: "90%", md: "50%" },
                m: "auto",
                mt: 2,
                "@media print": {
                    width: "88mm",
                    bgcolor: "white",
                    m: 0,
                    p: 1,
                    borderRadius: 0,
                },
            }}
        >
            <List sx={{ width: "100%", p: 0 }}>
                {products.map((person, index) => (
                    <React.Fragment key={person.email || index}>
                        <ListItem
                            sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "flex-end",
                                py: 2,
                                "@media print": {
                                    display: "block",
                                    py: 0.5,
                                    alignItems: "flex-start",
                                    justifyContent: "flex-start",
                                    borderBottom:
                                        index < products.length - 1
                                            ? "1px dashed #000"
                                            : "none",
                                },
                            }}
                        >
                            <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                    minWidth: 0,
                                    "@media print": {
                                        flexDirection: "column",
                                        alignItems: "flex-end",
                                        gap: 0,
                                    },
                                }}
                            >
                                <Stack
                                    direction="row-reverse"
                                    spacing={1.5}
                                    sx={{
                                        color: "pink",
                                        minWidth: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        "@media print": {
                                            flexDirection: "column",
                                            alignItems: "flex-end",
                                            color: "black",
                                            gap: 0,
                                        },
                                    }}
                                >
                                    {/* 👇 NEW PRINT LAYOUT GROUPING 👇 */}
                                    <Box
                                        sx={{
                                            display: "flex",
                                            flexDirection: "row-reverse",
                                            color: 'black',
                                            fontWeight: 'bold',
                                            gap: 2,
                                            "@media print": {
                                                display: "flex",
                                                flexDirection: "row-reverse",
                                                justifyContent: "space-between",
                                                width: "100%",
                                                textAlign: "left",
                                            },
                                        }}
                                    >
                                        <Typography
                                            sx={{
                                                fontSize: "2rem",
                                                fontFamily:
                                                    "Jameel Noori Nastaleeq, serif",
                                                fontWeight: "bold",
                                                "@media print": {
                                                    fontSize: "1.5rem",
                                                    fontFamily:
                                                        "Jameel Noori Nastaleeq, serif",
                                                    fontWeight: "bold",
                                                }
                                            }}
                                        >
                                            {person.urduname ?? "—"}
                                        </Typography>
                                        {person.qty !== undefined && (
                                            <Typography
                                                sx={{
                                                    m: 'auto',
                                                    fontSize: "0.9rem",
                                                    fontFamily: "monospace",
                                                    fontWeight: "normal",
                                                    border: 1,
                                                    p: '.5px 1px',
                                                }}
                                            >
                                                {person.qty}
                                            </Typography>
                                        )}
                                    </Box>
                                    {/* 👆 NEW PRINT LAYOUT GROUPING 👆 */}

                                    {/* 👇 ORIGINAL FIELD RENDERING (for screen + print fallback) 👇 */}
                                    {Object.entries(person)
                                        .filter(
                                            ([key]) =>
                                                key !== "imageUrl" &&
                                                key !== "qty" &&
                                                key !== "urduname"
                                        )
                                        .map(([key, value]) => (
                                            <Typography
                                                key={key}
                                                variant="body2"
                                                sx={{
                                                    color: "black",
                                                    overflow: "hidden",
                                                    fontWeight: "bold",
                                                    whiteSpace: "nowrap",
                                                    textOverflow: "ellipsis",
                                                    fontSize:
                                                        key === "urduname"
                                                            ? "2rem"
                                                            : "1.25rem",
                                                    fontFamily:
                                                        key === "urduname"
                                                            ? "Jameel Noori nastaleeq, serif"
                                                            : "Poppins, serif",
                                                    "@media print": {
                                                        fontSize:
                                                            key === "urduname"
                                                                ? "1.1rem"
                                                                : "0.9rem",
                                                        whiteSpace: "normal",
                                                        wordBreak: "break-word",
                                                        textAlign: "left",
                                                        fontFamily:
                                                            key === "urduname"
                                                                ? "Jameel Noori Nastaleeq, serif"
                                                                : "monospace",
                                                        fontWeight:
                                                            key === "urduname"
                                                                ? "bold"
                                                                : "normal",
                                                        lineHeight: 1.3,
                                                    },
                                                }}
                                            >
                                                {typeof value === "number"
                                                    ? value
                                                    : String(value ?? "—")}
                                            </Typography>
                                        ))}
                                </Stack>
                            </Stack>
                        </ListItem>

                        {index < products?.length - 1 && (
                            <Divider
                                sx={{
                                    borderColor: "rgba(16, 16, 16, 1)",
                                    "@media print": { display: "none" },
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </List>

            {/* Print button (hidden in print) */}
            <Box
                sx={{
                    mt: 2,
                    textAlign: "center",
                    "@media print": { display: "none" },
                }}
            >
                <button
                    onClick={() => window.print()}
                    style={{
                        padding: "6px 12px",
                        background: "#000",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Print
                </button>
            </Box>
        </Box>
    );
}
