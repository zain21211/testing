// coa.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Container, Grid, Box } from '@mui/material';
import CreateCustomer from './CreateCustomer';
import CustomerList from './CustomerList';
import axios from 'axios';
import useWindowDimensions from './useWindowDimensions'; // Import the custom hook

const COA = () => {
    const [accounts, setAccounts] = useState([]);
    const [token] = useState(localStorage.getItem("authToken"));
    const user = JSON.parse(localStorage.getItem("user"));
    const { height } = useWindowDimensions(); // Get window height
    const containerRef = useRef(null);
    const [tableHeight, setTableHeight] = useState(0);
    const names = accounts.map(account => account.name);
    const urdu = accounts.map(account => account.UrduName);

    const fetchAccounts = async () => {
        try {
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

    useEffect(() => {
        if (containerRef.current) {
            const containerTop = containerRef.current.getBoundingClientRect().top;
            // Adjust the subtraction value based on your layout's top margin and other elements
            setTableHeight(height - containerTop - 100);
        }
    }, [height]);

    return (
        <Box
            ref={containerRef}
            sx={{
                my: 2,
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',       // mobile → single column
                    md: '1fr 2fr',   // desktop → 1/3 + 2/3
                },
                gap: { xs: 1, md: 3 }, // reduce mobile gaps
            }}
        >
            {/* Left panel */}
            <Box sx={{ position: { md: 'sticky' }, alignSelf: "start" }}>
                <CreateCustomer onCustomerCreated={fetchAccounts} accounts={names} urdu={urdu} />
            </Box>

            {/* Right panel */}
            <Box>
                <CustomerList
                    customer={accounts}
                    onAccountDeleted={fetchAccounts}
                    tableHeight={tableHeight}
                />
            </Box>
        </Box>

    );
};

export default COA;