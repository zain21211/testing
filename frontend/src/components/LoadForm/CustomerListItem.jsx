import React from 'react';
import { ListItem, ListItemText, Button, CircularProgress, TextField, Box, Typography } from '@mui/material';

const CustomerListItem = ({ customer, nug, setNug }) => {
    const doc = customer.doc;
    return (
        <ListItem sx={{ display: "flex", flexDirection: 'row-reverse', justifyContent: "space-between", borderBottom: 1 }}>
            <ListItemText
                sx={{ width: "60%", textAlign: 'right' }} // left 70%
                primary={customer.UrduName}
                secondary={`${customer.route} `}
                primaryTypographyProps={{
                    sx: {
                        fontWeight: "bold",
                        fontSize: "2.5rem",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        letterSpacing: "normal",
                    },
                }}
                secondaryTypographyProps={{
                    sx: {
                        fontStyle: "italic",
                        color: "text.secondary",
                        fontWeight: "bold",
                        fontSize: "1.25rem",
                    },
                }}
            />

            <Box
                sx={{
                    width: "40%", // ✅ fixed proportion
                    display: "flex",
                    alignItems: "center",
                    // justifyContent: "flex-end",
                    gap: 1,
                }}
            >
                <TextField
                    label="NUG"
                    value={nug?.[doc] ?? ""}
                    inputProps={{
                        inputMode: "numeric",   // 📱 triggers numeric keypad
                        pattern: "[0-9]*",      // extra hint for iOS Safari
                    }}
                    onChange={e =>
                        setNug(prev => ({
                            ...prev,
                            [doc]: e.target.value,
                        }))
                    }
                    sx={{
                        flex: { xs: 1.5, sm: 1, md: 0.25 },
                        textAlign: "center",
                        "& .MuiInputBase-input": {
                            fontSize: "1.5rem",
                            fontWeight: "bold",
                            textAlign: "center", // ensures text is centered inside the input
                        },
                    }}
                />
                <Typography variant="h6" sx={{ backgroundColor: 'grey', p: 1, color: 'white', borderRadius: 2, minWidth: 50, textAlign: 'center' }}>
                    <span style={{ fontSize: "2rem", fontWeight: 600 }}>
                        {customer.shopper || 0}
                    </span>
                </Typography>
            </Box>
        </ListItem>

    );
};

export default CustomerListItem;