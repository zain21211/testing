import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Box, CircularProgress, Alert, Pagination } from '@mui/material';
import TransporterFilter from './TransporterFilter';
import CustomerList from './CustomerList';
import { useFetchList } from '../../hooks/LoadForm/useFetchList';

const CustomerDashboard = () => {
    const { customers, loading, error, fetchList, routes, totalRecords } = useFetchList();
    const [to, setTo] = useState('');
    const [loaders, setLoaders] = useState([]);
    const [filters, setFilters] = useState({ sortBy: 'date', sortOrder: 'DESC' });
    const [page, setPage] = useState(1);
    const limit = 50;
    const url = import.meta.env.VITE_API_URL;

    const fetchLoaders = async () => {
        try {
            const res = await axios.get(`${url}/customers/loaders`);
            const mappedLoaders = res.data.map(l => ({ label: l.name }));
            setLoaders(mappedLoaders);
        } catch (error) {
            console.error("Error fetching loaders:", error);
        }
    };

    const handlePageChange = (event, value) => {
        setPage(value);
    };

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch list whenever filters or page changes
    useEffect(() => {
        if (fetchList) fetchList(filters, page, limit);
    }, [filters, page, fetchList]);

    // Fetch loaders only once on mount
    useEffect(() => {
        fetchLoaders();
    }, []);

    return (
        <Box sx={{ padding: 2 }}>
            <TransporterFilter onFilterChange={handleFilterChange} routes={routes} />
            {loading && <CircularProgress sx={{ marginTop: 2 }} />}
            {error && <Alert severity="error" sx={{ marginTop: 2 }}>{error}</Alert>}
            {!loading && !error && (
                <>
                    <CustomerList customers={customers} fetchList={() => fetchList({}, page, limit)} to={to} setTo={setTo} deliver={loaders} user={user} />
                    {totalRecords > limit && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Pagination 
                                count={Math.ceil(totalRecords / limit)} 
                                page={page} 
                                onChange={handlePageChange} 
                                color="primary" 
                                size="large"
                            />
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
};

export default CustomerDashboard;