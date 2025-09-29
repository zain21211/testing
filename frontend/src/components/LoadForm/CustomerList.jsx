import React, { useState, useEffect } from 'react';
import { List, Typography, Button, CircularProgress, Box, Autocomplete, TextField } from '@mui/material';
import CustomerListItem from './CustomerListItem';
import axios from 'axios';
const url = `${import.meta.env.VITE_API_URL}`;

const CustomerList = ({ customers, fetchList, to, setTo, deliver }) => {
    const [loadingCustomerId, setLoadingCustomerId] = useState(null);
    const [nug, setNug] = useState({});
    const [loading, setLoading] = useState(false)

    const deleteItem = (doc) => {
        const copy = { ...nug };
        delete copy[doc];
        setNug(copy)
    }

    const handleLoadCustomer = async () => {
        try {
            setLoading(true)
            const res = await axios.put(`${url}/invoices/loadList/update`, {
                nug, status: 'loaded', to
            })
            const doc = res.data.doc;
            deleteItem(doc);
            fetchList();
            // Handle successful load if needed
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCustomerId(null);
            setLoading(false)
        }
    };

    if (customers.length === 0) {
        return <Typography>No customers to display.</Typography>;
    }

    return (
        <List>
            {customers.map((customer) => (
                <CustomerListItem
                    key={customer.acid}
                    customer={customer}
                    nug={nug}
                    setNug={setNug}
                    onLoad={handleLoadCustomer}
                    loading={loadingCustomerId === customer.acid}
                />
            ))}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    mt: 5,
                    gap: 2,
                    minWidth: 300,
                }}>
                <Autocomplete
                    freeSolo
                    disablePortal
                    id="to-autocomplete"
                    options={deliver}

                    sx={{ width: 300, mt: 1, }}
                    onInputChange={(e, val) => {
                        setTo(val)
                    }}
                    onChange={(event, newValue) => {
                        setTo(newValue ? newValue.label : null);
                    }}
                    renderInput={(params) => <TextField {...params} label="to" />}
                />
                <Button
                    variant="contained"
                    onClick={handleLoadCustomer}
                    disabled={loading}
                    sx={{ fontSize: "2rem", minWidth: 300, }}
                >
                    {loading ? <CircularProgress size={24} /> : "Load"}
                </Button>
            </Box>
        </List>
    );
};

export default CustomerList;