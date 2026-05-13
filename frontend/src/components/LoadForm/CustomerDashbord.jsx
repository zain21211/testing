import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Box, CircularProgress, Alert } from '@mui/material';
import TransporterFilter from './TransporterFilter';
import CustomerList from './CustomerList';
import { useFetchList } from '../../hooks/LoadForm/useFetchList';
import useLocalStorageState from 'use-local-storage-state';

const CustomerDashboard = () => {
    const { customers: allCustomers, setCustomers, loading, error, fetchList, routes } = useFetchList();
    const [to, setTo] = useState('');
    const [loaders, setLoaders] = useState([]);
    const getDefaultDateFilter = () => {
        const hour = new Date().getHours();
        return hour >= 17 ? 'tomorrow' : 'today';
    };

    const [filters, setFilters] = useState({ 
        dateFilter: getDefaultDateFilter(), 
        route: '', 
        acid: '', 
        doc: '', 
        customDate: new Date().toLocaleDateString('en-CA') 
    });
    const [nug, setNug] = useLocalStorageState('loadNugs', { defaultValue: {} });
    const [resetDocTrigger, setResetDocTrigger] = useState(0);
    const url = import.meta.env.VITE_API_URL;

    const clearNugs = useCallback(() => {
        setNug({});
    }, [setNug]);

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

    // Fetch list once on mount
    useEffect(() => {
        if (fetchList) fetchList(filters, 1, 5000); 
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
                const today = new Date().toLocaleDateString('en-CA');
                const itemDate = new Date(c.Date || c.date).toLocaleDateString('en-CA');
                matchDate = itemDate === today;
            } else if (filters.dateFilter === 'tomorrow') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toLocaleDateString('en-CA');
                const itemDate = new Date(c.Date || c.date).toLocaleDateString('en-CA');
                matchDate = itemDate === tomorrowStr;
            } else if (filters.dateFilter === 'custom' && filters.customDate) {
                const itemDate = new Date(c.Date || c.date).toLocaleDateString('en-CA');
                matchDate = itemDate === filters.customDate;
            }
            
            return matchRoute && matchAcid && matchDoc && matchDate;
        });

        // Sort Order: route (ASC), rno (ASC), Date (DESC), doc (DESC)
        return filtered.sort((a, b) => {
            // 1. Route (Ascending)
            const routeA = (a.route || '').toString();
            const routeB = (b.route || '').toString();
            if (routeA !== routeB) return routeA.localeCompare(routeB);

            // 2. RNO (Ascending)
            const rnoA = parseInt(a.rno || 0);
            const rnoB = parseInt(b.rno || 0);
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
        <Box sx={{ p: 0 }}>
            <Box sx={{
                position: 'sticky',
                top: 56, // Adjusting for fixed AppBar height
                zIndex: 100,
                bgcolor: 'white',
                p: 1,
                pb: 1,
                mt: -1, // Pull it up slightly to align with the toolbar offset
                borderBottom: '1px solid #eee',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                <TransporterFilter 
                    onFilterChange={handleFilterChange} 
                    onReset={() => {
                        fetchList(filters, 1, 5000);
                        clearNugs();
                    }}
                    routes={routes} 
                    resetDocTrigger={resetDocTrigger}
                    defaultDateFilter={getDefaultDateFilter()}
                />
            </Box>
            
            <Box sx={{ p: 1 }}>
                {loading && <CircularProgress sx={{ marginTop: 2 }} />}
                {error && <Alert severity="error" sx={{ marginTop: 2 }}>{error}</Alert>}
                {!loading && !error && (
                    <CustomerList 
                        customers={filteredAndSortedCustomers} 
                        fetchList={() => fetchList(filters, 1, 5000)} 
                        to={to} 
                        setTo={setTo} 
                        deliver={loaders} 
                        user={user} 
                        onSuccess={handleSuccess}
                        nug={nug}
                        setNug={setNug}
                    />
                )}
            </Box>
        </Box>
    );
};

export default CustomerDashboard;