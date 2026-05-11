import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Box, CircularProgress, Alert } from '@mui/material';
import TransporterFilter from './TransporterFilter';
import CustomerList from './CustomerList';
import { useFetchList } from '../../hooks/LoadForm/useFetchList';

const CustomerDashboard = () => {
    const { customers: allCustomers, setCustomers, loading, error, fetchList, routes } = useFetchList();
    const [to, setTo] = useState('');
    const [loaders, setLoaders] = useState([]);
    const [filters, setFilters] = useState({ dateFilter: 'all', route: '', acid: '', doc: '' });
    const [resetDocTrigger, setResetDocTrigger] = useState(0);
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

    const handleFilterChange = useCallback((newFilters) => {
        setFilters(newFilters);
    }, []);

    const handleSuccess = useCallback((docsToRemove) => {
        // Trigger Doc filter reset
        setResetDocTrigger(prev => prev + 1);
        
        // Remove customer from the local list
        if (docsToRemove && setCustomers) {
            const docsArray = Array.isArray(docsToRemove) ? docsToRemove : [docsToRemove];
            setCustomers(prev => prev.filter(c => !docsArray.includes(c.doc)));
        }
    }, [setCustomers]);

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Fetch list once on mount (with large limit to get all data)
    useEffect(() => {
        if (fetchList) fetchList({}, 1, 5000); 
    }, [fetchList]);

    // Fetch loaders only once on mount
    useEffect(() => {
        fetchLoaders();
    }, []);

    const filteredAndSortedCustomers = useMemo(() => {
        if (!allCustomers) return [];

        let filtered = allCustomers.filter(c => {
            const matchRoute = !filters.route || (c.route || c.RouteNumber || '').toLowerCase().includes(filters.route.toLowerCase());
            const matchAcid = !filters.acid || String(c.acid || c.ACID || '').includes(filters.acid);
            const matchDoc = !filters.doc || String(c.doc || '').includes(filters.doc);
            
            let matchDate = true;
            if (filters.dateFilter === 'today') {
                const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                const itemDate = new Date(c.Date || c.date).toLocaleDateString('en-CA');
                matchDate = itemDate === today;
            }
            
            return matchRoute && matchAcid && matchDoc && matchDate;
        });

        // Sort Order: route (ASC), RNO (ASC), Date (DESC), doc (DESC)
        return filtered.sort((a, b) => {
            // 1. Route (Ascending)
            const routeA = (a.route || a.RouteNumber || '').toString();
            const routeB = (b.route || b.RouteNumber || '').toString();
            if (routeA !== routeB) return routeA.localeCompare(routeB);

            // 2. RNO (Ascending)
            const rnoA = parseInt(a.RNO || a.rno || 0);
            const rnoB = parseInt(b.RNO || b.rno || 0);
            if (rnoA !== rnoB) return rnoA - rnoB;

            // 3. Date (Descending)
            const dateA = new Date(a.Date || a.date || 0).getTime();
            const dateB = new Date(b.Date || b.date || 0).getTime();
            if (dateA !== dateB) return dateB - dateA;

            // 4. Doc (Descending)
            const docA = parseInt(a.doc || 0);
            const docB = parseInt(b.doc || 0);
            return docB - docA;
        });
    }, [allCustomers, filters]);

    return (
        <Box sx={{ padding: 2 }}>
            <TransporterFilter 
                onFilterChange={handleFilterChange} 
                routes={routes} 
                resetDocTrigger={resetDocTrigger}
            />
            {loading && <CircularProgress sx={{ marginTop: 2 }} />}
            {error && <Alert severity="error" sx={{ marginTop: 2 }}>{error}</Alert>}
            {!loading && !error && (
                <>
                    <CustomerList 
                        customers={filteredAndSortedCustomers} 
                        fetchList={() => fetchList({}, 1, 5000)} 
                        to={to} 
                        setTo={setTo} 
                        deliver={loaders} 
                        user={user} 
                        onSuccess={handleSuccess}
                    />
                </>
            )}
        </Box>
    );
};

export default CustomerDashboard;