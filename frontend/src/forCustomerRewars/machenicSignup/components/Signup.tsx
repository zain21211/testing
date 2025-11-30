import React from 'react';
import { Box, TextField, Typography } from '@mui/material';

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
    // Add any other fields required for mechanic signup
}

interface SignupProps {
    data: MechanicSignupData; // This component is for displaying or pre-filling, not managing state
}

const Signup: React.FC<SignupProps> = ({ data }) => {
    return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4, border: '1px solid #ccc', borderRadius: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
                Mechanic Signup
            </Typography>
            <Box display="grid" gap={2} gridTemplateColumns="repeat(2, 1fr)">
                <Box gridColumn="span 2">
                    <TextField
                        fullWidth
                        label="Mechanic Name"
                        value={data.name}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box gridColumn="span 2">
                    <TextField
                        fullWidth
                        label="Email"
                        value={data.email}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box gridColumn="span 2">
                    <TextField
                        fullWidth
                        label="Phone Number"
                        value={data.phone}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box gridColumn="span 2">
                    <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                        Location Details
                    </Typography>
                    <TextField
                        fullWidth
                        label="Address"
                        value={data.location.address}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box>
                    <TextField
                        fullWidth
                        label="Latitude"
                        value={data.location.lat}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box>
                    <TextField
                        fullWidth
                        label="Longitude"
                        value={data.location.lng}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box gridColumn="span 2">
                    <Typography variant="h6" component="h2" sx={{ mt: 2, mb: 1 }}>
                        Images
                    </Typography>
                    <TextField
                        fullWidth
                        label="Mechanic Photo URL"
                        value={data.images.machenic}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
                <Box gridColumn="span 2">
                    <TextField
                        fullWidth
                        label="Shop Photo URLs (comma separated)"
                        value={data.images.shop.join(', ')}
                        variant="outlined"
                        margin="normal"
                        InputProps={{ readOnly: true }}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default Signup;
