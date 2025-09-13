import React from 'react';
import { Box, Typography } from '@mui/material';
import LedgerSearchForm from '../CustomerSearch'; // Adjust path as needed

const style = { backgroundColor: "white", borderRadius: "1rem", p: 1, mb: 2 };

export const CreditSection = ({ onSelectCredit, onSetIsCredit }) => (
    <Box sx={{ backgroundColor: "green", color: "white", borderRadius: "1.5rem" }}>
        <Typography variant='h4' fontWeight={"bold"} p={2}>on set{onSetIsCredit}</Typography>
        <Typography variant='h4' fontWeight={"bold"} p={2}>CREDIT</Typography>
        <Box sx={{ padding: "1rem", borderRadius: "2rem" }}>
            <Box sx={style}>
                <LedgerSearchForm
                    usage={"paymentCredit"}
                    onSelect={onSelectCredit}
                    formType="credit"
                    isCust={onSetIsCredit}
                />
            </Box>
        </Box>
    </Box>
);
