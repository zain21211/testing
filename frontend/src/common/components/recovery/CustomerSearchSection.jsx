import React from 'react';
import LedgerSearchForm from '../../CustomerSearch';
import { TextField, Button, Box, Typography, Alert, CircularProgress } from '@mui/material';

export const CustomerSearchSection = ({
    selectedCustomer,
    accountID,
    customerName,
    balance,
    overDue,
    remainingBalance,
    loadingFinancials,
    error,
    onFetchData,
    onReset,
    onLedgerClick,
    searchInputRef,
    route,
    description,
    setDescription,
}) => {
    return (
        <Box>
            <Box
                sx={{
                    textAlign: 'center',
                    display: 'grid',
                    gap: 2,
                    alignItems: 'center',
                }}
            >
                <Box ref={searchInputRef}>
                    <LedgerSearchForm
                        usage={'recovery'}
                        onSelect={onFetchData}
                        ID={accountID}
                        route={route}
                        onReset={onReset}
                        ref={searchInputRef}
                    />
                </Box>
            </Box>

            <Box
                sx={{
                    minHeight: '3em',
                    border: '1px solid #eee',
                    p: 1,
                    borderRadius: 1,
                    mt: 1,
                }}
            >
                {(loadingFinancials || !selectedCustomer) && !error && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        display="flex"
                        alignItems="center"
                        gap={1}
                    >
                        <CircularProgress size={16} /> Loading customer...
                    </Typography>
                )}
                {error && !loadingFinancials && (
                    <Alert severity="error" sx={{ fontSize: '0.9rem', py: 0.5 }}>
                        {error}
                    </Alert>
                )}
                {!loadingFinancials && !error && !selectedCustomer && accountID && (
                    <Typography variant="body2" color="textSecondary">
                        Enter valid Account ID or search.
                    </Typography>
                )}

                <Box display="grid" gridTemplateColumns="repeat(6, 1fr)" alignItems={'center'} gap={2}>
                    {selectedCustomer && (
                        <Box
                            sx={{
                                gridColumn: {
                                    xs: 'span 2',
                                    sm: 'span 2',
                                    md: 'span 2',
                                    xl: 'span 2',
                                },
                                height: '100%',
                            }}
                        >
                            <Button
                                onClick={onLedgerClick}
                                variant="contained"
                                color="primary"
                                fullWidth
                                sx={{
                                    height: '90%',
                                    transition: 'background-color 0.3s, color 0.3s',
                                    letterSpacing: '0.25em',
                                    '&:hover': {
                                        backgroundColor: 'primary.dark',
                                        color: 'white',
                                        borderColor: 'primary',
                                    },
                                }}
                            >
                                LEDGER
                            </Button>
                        </Box>
                    )}

                    <TextField
                        label="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        sx={{ gridColumn: { xs: 'span 4', sm: 'span 4' } }}
                    />

                    {balance !== null && balance !== '' && selectedCustomer && (
                        <Box
                            display="grid"
                            gridTemplateColumns="repeat(3, 1fr)"
                            gridColumn={{ xs: 'span 6', sm: 'span 6' }}
                            alignItems="center"
                            gap={2}
                        >
                            <TextField
                                label="Balance"
                                type="text"
                                value={balance}
                                disabled
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        fontWeight: 'bold',
                                        textAlign: 'right',
                                        WebkitTextFillColor: 'red !important',
                                        fontSize: '1.5rem',
                                    },
                                }}
                            />
                            <TextField
                                label="Remaining"
                                type="text"
                                value={remainingBalance}
                                disabled
                                size="small"
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        fontWeight: 'bold',
                                        textAlign: 'right',
                                        WebkitTextFillColor: 'green !important',
                                        fontSize: '1.5rem',
                                    },
                                }}
                            />
                            {overDue !== null && (
                                <TextField
                                    label="OVERDUE"
                                    type="text"
                                    value={overDue}
                                    disabled
                                    fullWidth
                                    InputLabelProps={{
                                        shrink: true,
                                        sx: {
                                            color: 'black !important',
                                            fontWeight: 'bold !important',
                                            backgroundColor: 'white !important',
                                            paddingRight: 2,
                                            paddingLeft: '7px',
                                            borderRadius: '4px',
                                            fontSize: '1rem',
                                        },
                                    }}
                                    InputProps={{
                                        sx: {
                                            '& input.Mui-disabled': {
                                                WebkitTextFillColor: overDue !== '0.00' ? 'white' : 'black !important',
                                                textAlign: 'right',
                                                fontWeight: 'bold',
                                                fontSize: '1.5rem',
                                            },
                                        },
                                    }}
                                    sx={{
                                        width: { xs: '100%', md: '150px' },
                                        '& .MuiOutlinedInput-root': {
                                            backgroundColor: overDue !== '0.00' ? 'red' : 'transparent',
                                            '& fieldset': {
                                                borderColor: overDue !== '0.00' ? 'red' : undefined,
                                            },
                                            '&:hover fieldset': {
                                                borderColor: overDue !== '0.00' ? 'red' : undefined,
                                            },
                                            '&.Mui-focused fieldset': {
                                                borderColor: overDue !== '0.00' ? 'red' : undefined,
                                            },
                                        },
                                    }}
                                />
                            )}
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};

export default CustomerSearchSection;


