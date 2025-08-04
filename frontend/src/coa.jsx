import React, { useState, useEffect } from 'react';
import { Container, Grid, Box } from '@mui/material';
import CreateCustomer from './CreateCustomer';
import CustomerList from './CustomerList';
import axios from 'axios';

const COA = () => {
    const [accounts, setAccounts] = useState([]);
const [token] = useState(localStorage.getItem("authToken"));
const user = JSON.parse(localStorage.getItem("user"));
    const fetchAccounts = async () => {
        console.log("in coa")
        try {
            // const key = `${import.meta.env.VITE_API_URL}/customers/${formType}`;

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/customers`, 
                            {
              headers: { Authorization: `Bearer ${token}` },
              params: { form: "COA", username: user.username },
            }
            );
            const data = Array.isArray(response.data) ? response.data : [];
            setAccounts(data);
            console.log('Fetched accounts:', data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    return (
        <Container
            maxWidth="xl"
            sx={{
                mt: 10,
                mb: 4,
                fontSize: {
                    xs: '.5rem', // mobile
                    sm: '0.8rem',
                    md: '0.875rem', // medium screens
                },
            }}
        >
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: {md: 'repeat(3, 1fr)'},
                    gap: 5,
                }}
            >
                {/* CreateCustomer Panel */}
                <Box sx={{ position: { md: 'sticky' }, gridColumn: {md: 'span 1'} }}>
                    <CreateCustomer onCustomerCreated={fetchAccounts} />
                </Box>
{/* 
                <Box
                    sx={{
                        gridColumn: 'span 2',
                    }}
                >
                    {/* Customer List */}
                    {/* <CustomerList customer={accounts} onAccountDeleted={fetchAccounts} /> */}
                {/* */} 
            </Box>
        </Container>
    );
};

export default COA;
