import React, { useState } from 'react';
import { TextField, Button, Box, Paper, useMediaQuery, useTheme } from '@mui/material';
import axios from 'axios';

const url = import.meta.env.VITE_API_URL;

const Search = ({ type, onSearch }) => {
    const token = localStorage.getItem("authToken"); // always get fresh token

    const [name, setName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [route, setRoute] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSearch = async () => {
        try {
            const search = {
                name,
                route,
                phoneNumber,
            };

            const result = await axios.get(`${url}/customers`, {
                params: search, // query string
                headers: {
                    Authorization: `Bearer ${token}`, // or your token string
                    "Content-Type": "application/json",
                },
            });

            const filtered = result.data;
            onSearch(filtered);
        } catch (error) {
            console.error("Search failed:", error);
            alert("Something went wrong while searching!");
        }
    };


    // Handle pressing Enter key
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <Box

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
                    label="Number"
                    variant="outlined"
                    fullWidth
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
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
                        fontSize: '1.2rem',
                    }}
                >
                    Search
                </Button>
            </Box>


        </Box>
    );
};

export default Search;