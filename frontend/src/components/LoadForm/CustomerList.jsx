import React, { useState, useEffect } from 'react';
import { List, Typography, Button, CircularProgress, Box, Autocomplete, TextField } from '@mui/material';
import CustomerListItem from './CustomerListItem';
import axios from 'axios';
const url = `${import.meta.env.VITE_API_URL}`;

const CustomerList = ({ customers, fetchList, to, setTo, deliver, user, onSuccess, nug, setNug }) => {
    if (!customers) return null;
    const [loadingCustomerId, setLoadingCustomerId] = useState(null);
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
            // Fetch fresh data from DB after load to refresh the list
            if (fetchList) fetchList();
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

    const totalCustomers = customers.length;
    const totalNugs = customers.reduce((sum, c) => {
        const val = parseFloat((nug || {})[c.doc] || 0);
        return sum + (isNaN(val) ? 0 : val);
    }, 0);

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
                    flexDirection: 'column',
                    alignItems: 'center',
                    mt: 5,
                    gap: 2,
                    pb: 5
                }}>
                
                <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    width: '100%',
                    mb: 2,
                    bgcolor: '#e3f2fd',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #90caf9',
                    fontFamily: "Jameel Noori Nastaleeq, serif"
                }}>
                    <Box sx={{ width: '50%', textAlign: 'left', pl: 4 }}>
                        <Typography sx={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#2e7d32', fontFamily: "inherit" }}>
                            کل نگ تعداد: {totalNugs}
                        </Typography>
                    </Box>
                    <Box sx={{ width: '50%', textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#1565c0', fontFamily: "inherit" }}>
                            کل گاہک: {totalCustomers}
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'center' }}>
                    <Autocomplete
                        freeSolo
                        disablePortal
                        id="to-autocomplete"
                        options={deliver}
                        sx={{ width: 300 }}
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
                        sx={{ fontSize: "2rem", minWidth: 300 }}
                    >
                        {loading ? <CircularProgress size={24} /> : "Load"}
                    </Button>
                </Box>
            </Box>
        </List>
    );
};

export default CustomerList;