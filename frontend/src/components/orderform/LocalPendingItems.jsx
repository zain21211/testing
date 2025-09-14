import React, { useState, useEffect } from 'react';
import List from '@mui/material/List';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { formatCurrency } from '../../utils/formatCurrency'; // Ensure this utility exists
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const LocalPendingItems = ({ handleRemoveProduct, handlePendingItems, items, flag }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        console.log("Pending Items Updated:", items);
    }, [items]);
    const getItems = async () => {
        try {
            setLoading(true);
            await handlePendingItems('local');
        } catch (err) {
            setError('Failed to load pending items.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        if (flag)
            getItems();
    }, [flag]); // The empty dependency array ensures this effect runs only once on mount

    if (loading) {
        return <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">Error: {error}</Alert>;
    }

    return (
        <List
            dense
            sx={{
                height: 300,
                overflowY: "auto",
                border: "1px solid #eee",
                borderRadius: "4px",
            }}
        >
            {items.map((item, index) => (
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
        </List>);
};

export default LocalPendingItems;