import React, { useState, useEffect } from 'react';
import { List, Typography, Button, CircularProgress, Box, Autocomplete, TextField } from '@mui/material';
import CustomerListItem from './CustomerListItem';
import axios from 'axios';
const url = `${import.meta.env.VITE_API_URL}`;
import useLocalStorageState from 'use-local-storage-state';

const CustomerList = ({ customers, fetchList, to, setTo, deliver, user, onSuccess }) => {
    const [loadingCustomerId, setLoadingCustomerId] = useState(null);
    const [nug, setNug] = useLocalStorageState('loadNugs', {});
    const [loading, setLoading] = useState(false)

    const deleteItem = async (doc) => {
        const copy = { ...nug };
        await Promise.all(
            doc.map(async (d) => {
                delete copy[d];
            })
        );

        setNug(copy);
    };


    const handleLoadCustomer = async () => {
        try {
            setLoading(true)
            const res = await axios.put(`${url}/invoices/loadList/update`, {
                nug, 
                status: 'loaded', 
                to, 
                username: user?.username,
                timestamp: new Date().toISOString() // Auditing
            })
            const docs = res.data.updated; // This is usually an array
            deleteItem(docs);
            if (onSuccess) onSuccess(docs);
            // We don't necessarily need fetchList() here if we do local removal, 
            // but keeping it as a fallback might be okay. 
            // However, the user said "without refreshing data from table".
            // fetchList(); 
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
                    key={customer.doc || customer.acid}
                    customer={customer}
                    nug={nug}
                    setNug={setNug}
                    onLoad={handleLoadCustomer}
                    loading={loadingCustomerId === customer.acid}
                    user={user}
                    fetchList={fetchList}
                    onSuccess={onSuccess}
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
                    disabled={loading || !to || !nug}
                    sx={{ fontSize: "2rem", minWidth: 300, }}
                >
                    {loading ? <CircularProgress size={24} /> : "Load"}
                </Button>
            </Box>
        </List>
    );
};

export default CustomerList;