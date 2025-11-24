import React from 'react';
import { Box, Typography } from '@mui/material';

function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                        ? theme.palette.grey[200]
                        : theme.palette.grey[800],
                p: 2,
                mt: 'auto', // Pushes the footer to the bottom
                textAlign: 'center',
            }}
        >
            <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold', textTransform: 'uppercase', fontFamily: 'poppins, serif' }}>


                Powered by varion
            </Typography>
        </Box>
    );
}

export default Footer;


