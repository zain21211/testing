import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import Signup from './Signup';
import useMachenicSignup from '../hooks/useMachenicSignup';

interface MechanicSignupData {
    name: string;
    email: string;
    phone: string;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    images: {
        shop: string[];
        machenic: string;
    };
}

const MechanicSignupMain: React.FC = () => {
    const { signup, loading, error, success } = useMachenicSignup();

    const [formData, setFormData] = useState<MechanicSignupData>({
        name: '',
        email: '',
        phone: '',
        location: {
            lat: 0,
            lng: 0,
            address: '',
        },
        images: {
            shop: [],
            machenic: '',
        },
    });

    const [previewMode, setPreviewMode] = useState(false);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => {
            const keys = field.split('.');
            if (keys.length === 1) {
                return { ...prev, [field]: value };
            } else if (keys.length === 2) {
                return {
                    ...prev,
                    [keys[0]]: {
                        ...(prev[keys[0] as keyof MechanicSignupData] as any),
                        [keys[1]]: value,
                    },
                };
            } else if (keys.length === 3) {
                return {
                    ...prev,
                    [keys[0]]: {
                        ...(prev[keys[0] as keyof MechanicSignupData] as any),
                        [keys[1]]: {
                            ...((prev[keys[0] as keyof MechanicSignupData] as any)[keys[1]]),
                            [keys[2]]: value,
                        },
                    },
                };
            }
            return prev;
        });
    };

    const handleShopImagesChange = (value: string) => {
        const imagesArray = value.split(',').map(img => img.trim()).filter(img => img);
        handleInputChange('images.shop', imagesArray);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await signup(formData);
        if (result) {
            console.log('Signup successful:', result);
            // Optionally reset form or redirect user
        }
    };

    const togglePreview = () => {
        setPreviewMode(!previewMode);
    };

    if (previewMode) {
        return (
            <Box sx={{ p: 3 }}>
                <Button variant="outlined" onClick={togglePreview} sx={{ mb: 2 }}>
                    Back to Form
                </Button>
                <Signup data={formData} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto', mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Mechanic Signup Form
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Signup successful! Your account has been created.
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Box display="grid" gap={2} gridTemplateColumns="repeat(2, 1fr)">
                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Mechanic Name"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                variant="outlined"
                                required
                            />
                        </Box>

                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                variant="outlined"
                                required
                            />
                        </Box>

                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Phone Number"
                                value={formData.phone}
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                variant="outlined"
                                required
                            />
                        </Box>

                        <Box gridColumn="span 2">
                            <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                                Location Details
                            </Typography>
                        </Box>

                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Address"
                                value={formData.location.address}
                                onChange={(e) => handleInputChange('location.address', e.target.value)}
                                variant="outlined"
                                required
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Latitude"
                                type="number"
                                value={formData.location.lat}
                                onChange={(e) => handleInputChange('location.lat', parseFloat(e.target.value) || 0)}
                                variant="outlined"
                                required
                                inputProps={{ step: 'any' }}
                            />
                        </Box>

                        <Box>
                            <TextField
                                fullWidth
                                label="Longitude"
                                type="number"
                                value={formData.location.lng}
                                onChange={(e) => handleInputChange('location.lng', parseFloat(e.target.value) || 0)}
                                variant="outlined"
                                required
                                inputProps={{ step: 'any' }}
                            />
                        </Box>

                        <Box gridColumn="span 2">
                            <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                                Images
                            </Typography>
                        </Box>

                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Mechanic Photo URL"
                                value={formData.images.machenic}
                                onChange={(e) => handleInputChange('images.machenic', e.target.value)}
                                variant="outlined"
                                required
                            />
                        </Box>

                        <Box gridColumn="span 2">
                            <TextField
                                fullWidth
                                label="Shop Photo URLs (comma separated)"
                                value={formData.images.shop.join(', ')}
                                onChange={(e) => handleShopImagesChange(e.target.value)}
                                variant="outlined"
                                multiline
                                rows={2}
                                helperText="Enter multiple URLs separated by commas"
                            />
                        </Box>

                        <Box gridColumn="span 2" sx={{ mt: 2, display: 'flex', gap: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                fullWidth
                                disabled={loading}
                                startIcon={loading ? <CircularProgress size={20} /> : null}
                            >
                                {loading ? 'Submitting...' : 'Submit Signup'}
                            </Button>

                            <Button
                                type="button"
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                onClick={togglePreview}
                            >
                                Preview
                            </Button>
                        </Box>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default MechanicSignupMain;
