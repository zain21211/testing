import React, { useState } from 'react';
import { TextField, Button, Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import axios from 'axios';

const Search = ({ type, onSearch }) => {
    const [name, setName] = useState('');
    const [spo, setSpo] = useState('');
    const [route, setRoute] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSearch = async () => {
        if (!name && !spo && !route) {
            alert('At least one search parameter is required!');
            return;
        }
        console.log('Searching with:', { type, name, spo, route });
        try {
            const response = await axios.get(`/api/search`, {
                params: { type, name, spo, route }
            });
            onSearch(response.data); // Pass the search results to the parent component
        } catch (error) {
            console.error('Error searching:', error);
            alert('Error searching');
        }
    };

    // Handle pressing Enter key
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{
                padding: { xs: '16px', sm: '20px' },
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(3, 1fr)",   // mobile → 3 fields in one row
                        sm: "repeat(4, 1fr)",   // desktop → 3 fields + button
                    },
                    gap: 2,
                    alignItems: "center",
                }}
            >
                {/* Name */}
                <TextField
                    label="Name"
                    variant="outlined"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyPress={handleKeyPress}
                    size={isMobile ? "small" : "medium"}
                />

                {/* Spo */}
                <TextField
                    label="Spo"
                    variant="outlined"
                    fullWidth
                    value={spo}
                    onChange={(e) => setSpo(e.target.value)}
                    onKeyPress={handleKeyPress}
                    size={isMobile ? "small" : "medium"}
                />

                {/* Route */}
                <TextField
                    label="Route"
                    variant="outlined"
                    fullWidth
                    value={route}
                    onChange={(e) => setRoute(e.target.value)}
                    onKeyPress={handleKeyPress}
                    size={isMobile ? "small" : "medium"}
                />

                {/* Search button */}
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    size={isMobile ? "medium" : "large"}
                    sx={{
                        gridColumn: { xs: "1 / -1", sm: "auto" }, // full row on mobile
                        width: { xs: "100%", sm: "auto" },
                        fontSize: isMobile ? '1.2rem' : '1.5rem',
                    }}
                >
                    Search
                </Button>
            </Box>


        </Paper>
    );
};

export default Search;