// src/components/ApiLogViewer.js
import React, { useEffect, useState, useMemo } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Container,
    Button,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Grid,
} from '@mui/material';
import { fetchApiLogs } from '../utils/api';
import LogCard from './LogCard';
import RefreshIcon from '@mui/icons-material/Refresh';

// Helper function to extract username and userType (must match LogCard's logic)
const extractUserInfo = (log) => {
    let username = 'N/A';
    let userType = 'N/A';

    // --- Hypothetical Extraction Logic ---
    // If username/userType were in custom headers:
    if (log.requestHeaders && log.requestHeaders['x-username']) {
        username = log.requestHeaders['x-username'];
    }
    if (log.requestHeaders && log.requestHeaders['x-usertype']) {
        userType = log.requestHeaders['x-usertype'];
    }
    // --- End Hypothetical Extraction Logic ---

    return { username, userType };
};


const ApiLogViewer = () => {
    const [allLogs, setAllLogs] = useState([]); // Store all fetched logs
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter states
    const [usernameFilter, setUsernameFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // Can be string (e.g., '200', '404') or empty

    const getLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchApiLogs();
            console.log("Fetched API logs:", data);
            setAllLogs(data[0]);
        } catch (err) {
            setError(err.message || 'Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getLogs();
    }, []);

    // Filtered logs based on state
    const filteredLogs = useMemo(() => {
        let currentLogs = [...allLogs];

        if (usernameFilter) {
            currentLogs = currentLogs.filter((log) => {
                const { username } = extractUserInfo(log);
                return username.toLowerCase().includes(usernameFilter.toLowerCase());
            });
        }

        if (statusFilter) {
            currentLogs = currentLogs.filter(
                (log) => String(log.responseStatus) === statusFilter
            );
        }

        return currentLogs;
    }, [allLogs, usernameFilter, statusFilter]);

    // Derive unique status codes for the dropdown filter
    const uniqueStatusCodes = useMemo(() => {
        const statuses = new Set(allLogs.map(log => String(log.responseStatus)));
        return Array.from(statuses).sort((a, b) => parseInt(a) - parseInt(b));
    }, [allLogs]);


    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    API Log Viewer
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={getLogs}
                    disabled={loading}
                >
                    Refresh Logs
                </Button>
            </Box>

            {/* Filter Section */}
            <Box sx={{ mb: 3, p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
                <Typography variant="h6" gutterBottom>Filters</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="Filter by Username"
                            variant="outlined"
                            value={usernameFilter}
                            onChange={(e) => setUsernameFilter(e.target.value)}
                            sx={{ mb: { xs: 2, sm: 0 } }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                            <InputLabel id="status-filter-label">Filter by Status</InputLabel>
                            <Select
                                labelId="status-filter-label"
                                id="status-filter"
                                value={statusFilter}
                                label="Filter by Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="">
                                    <em>All</em>
                                </MenuItem>
                                {uniqueStatusCodes.map((status) => (
                                    <MenuItem key={status} value={status}>
                                        {status}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Box>


            {loading && (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    Error: {error}
                </Alert>
            )}

            {!loading && filteredLogs.length === 0 && !error && (
                <Alert severity="info">
                    No API logs found matching your filters.
                </Alert>
            )}

            <Box>
                {filteredLogs.map((log) => (
                    <LogCard key={log._id?.date || Math.random()} log={log} />
                ))}
            </Box>
        </Container>
    );
};

export default ApiLogViewer;