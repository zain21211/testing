import React, { useState } from 'react';
import { TextField, Button, Grid, Paper, useMediaQuery, useTheme } from '@mui/material';
import axios from 'axios';

const Search = ({ type, onSearch }) => {
    const [name, setName] = useState('');
    const [company, setCompany] = useState('');
    const [model, setModel] = useState('');
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSearch = async () => {
        if (!name && !company && !model) {
            alert('At least one search parameter is required!');
            return;
        }
        console.log('Searching with:', { type, name, company, model });
        try {
            const response = await axios.get(`/api/search`, {
                params: { type, name, company, model }
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
                marginTop: '20px',
                width: '100%'
            }}
        >
            <Grid container spacing={2} direction="column">
                {/* First row with two fields */}
                <Grid item>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Name"
                                variant="outlined"
                                fullWidth
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Company"
                                variant="outlined"
                                fullWidth
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                onKeyPress={handleKeyPress}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                {/* Second row with one field */}
                <Grid item>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                label="Model"
                                variant="outlined"
                                fullWidth
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                onKeyPress={handleKeyPress}
                                size={isMobile ? "small" : "medium"}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                {/* Third row with button alone */}
                <Grid item sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleSearch}
                        size={isMobile ? "medium" : "large"}
                    >
                        Search
                    </Button>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default Search;