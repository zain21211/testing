import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import TransporterFilter from './TransporterFilter';
import CustomerList from './CustomerList';
import { useFetchList } from '../../hooks/LoadForm/useFetchList';

const deliver = [
    { label: 'COUNTER (MZAIN)' },
    { label: 'KARVAN' },
    { label: 'SUZUKI' },
    { label: 'ARIF' },
    { label: 'SALMAN' },
    { label: 'COUNTER (FAKHAR)' },
];

const CustomerDashboard = () => {
    const { customers, loading, error, fetchList, routes } = useFetchList();
    const [to, setTo] = useState('');

    useEffect(() => {
        if (fetchList)
            fetchList()
    }, [])
    return (
        <Box sx={{ padding: 2 }}>
            <TransporterFilter onFilterChange={fetchList} routes={routes} />
            {loading && <CircularProgress sx={{ marginTop: 2 }} />}
            {error && <Alert severity="error" sx={{ marginTop: 2 }}>{error}</Alert>}
            {!loading && !error && <CustomerList customers={customers} fetchList={fetchList} to={to} setTo={setTo} deliver={deliver} />}
        </Box>
    );
};

export default CustomerDashboard;