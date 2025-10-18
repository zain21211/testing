import React from 'react';
import { Box, Typography } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';

export const TotalsDisplaySection = ({
    totalCash,
    totalAmount,
    totalJazzcash,
    totalEasypaisa,
    totalCrownWallet,
    totalMeezanBank,
    currentTotalExpenses,
    user,
}) => {
    return (
        <Box display={'flex'} justifyContent={'space-between'} gap={2} p={2}>
            <Box sx={{ width: '30%' }}>
                <Typography variant="h6" color="text">
                    {new Date().toLocaleDateString('en-PK', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                    })}
                </Typography>
                <Typography variant="h5" fontWeight="bold" letterSpacing={2} color="text">
                    {user?.username}
                </Typography>
            </Box>
            <Box sx={{ borderTop: '1px solid #eee', textAlign: 'right', width: '70%' }}>
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                    {totalCash !== 0 && (
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            Cash RECED: <strong>{formatCurrency(totalCash.toFixed(0))}</strong>
                        </Typography>
                    )}
                    {currentTotalExpenses !== 0 && (
                        <Typography variant="h6" gutterBottom>
                            Total Expenses: {formatCurrency(currentTotalExpenses.toFixed(0))}
                        </Typography>
                    )}
                    {totalCash !== 0 && (
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                            NET Cash: <strong>{formatCurrency(totalCash.toFixed(0) - currentTotalExpenses)}</strong>
                        </Typography>
                    )}
                    {totalJazzcash > 0 && (
                        <Typography variant="body1">
                            Total Jazzcash: <strong>{formatCurrency(totalJazzcash.toFixed(0))}</strong>
                        </Typography>
                    )}
                    {totalEasypaisa > 0 && (
                        <Typography variant="body1">
                            Total Easypaisa: <strong>{formatCurrency(totalEasypaisa.toFixed(0))}</strong>
                        </Typography>
                    )}
                    {totalCrownWallet > 0 && (
                        <Typography variant="body1">
                            Total Crown Wallet: <strong>{formatCurrency(totalCrownWallet.toFixed(0))}</strong>
                        </Typography>
                    )}
                    {totalMeezanBank > 0 && (
                        <Typography variant="body1">
                            Total Meezan Bank: <strong>{formatCurrency(totalMeezanBank.toFixed(0))}</strong>
                        </Typography>
                    )}
                </Box>
                <Typography variant="h6" gutterBottom>
                    Overall Received: <strong>{formatCurrency(totalAmount.toFixed(0))}</strong>
                </Typography>
            </Box>
        </Box>
    );
};

export default TotalsDisplaySection;


