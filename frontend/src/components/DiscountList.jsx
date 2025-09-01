import React from "react";
import { Box, Divider, List, ListItem, ListItemText, Typography } from "@mui/material";

export default function DiscountList({ discountList }) {
    if (!discountList?.length) return null;

    return (
        <Box sx={{ border: "1px solid #e0e0e0", borderRadius: 1, p: 1 }}>
            <List dense sx={{ py: 0 }}>
                {discountList.map((item, index) => (
                    <React.Fragment key={index}>
                        <ListItem sx={{ py: 0.5 }}>
                            <ListItemText
                                primary={
                                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: "0.25rem 1rem" }}>
                                        {Object.entries(item).map(([key, value]) => (
                                            <Typography
                                                component="span"
                                                variant="body2"
                                                key={key}
                                                sx={{ textTransform: "uppercase" }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    component="span"
                                                    sx={{ fontWeight: "bold" }}
                                                >
                                                    {key}:
                                                </Typography>
                                                {` ${String(value)}`}
                                            </Typography>
                                        ))}
                                    </Box>
                                }
                            />
                        </ListItem>
                        {index < discountList.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                ))}
            </List>
        </Box>
    );
}
