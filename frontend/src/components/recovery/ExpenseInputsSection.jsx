// components/ExpenseInputsSection.jsx (updated)
import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { TextField, Box, Typography, FormLabel, Alert } from '@mui/material';

const expenseLabelMap = {
    petrol: 'Petrol',
    toll: 'Toll',
    repair: 'Repair',
    entertainment: 'Entertainment',
    bilty: 'Bilty',
    zaqat: 'Zaqat',
    localPurchase: 'Local Purchase',
    exp: 'Misc Expense',
    salary: 'Salary',
    salesBonus: 'Sales Bonus',
};

const ExpenseInputsSection = ({
    expenseStateMap,
    currentTotalExpenses,
    expenseKeys,
    capturing,
    submissionStatus,
    detailedResults,
}) => {
    return (
        <Box
            sx={{
                mt: 4,
                backgroundColor: 'red',
                color: 'white',
                fontWeight: 'bold',
                p: 2,
                borderRadius: 3,
            }}
        >
            <Typography variant="h5" gutterBottom>
                <b> Total Expenses: {formatCurrency(currentTotalExpenses.toFixed(0))}</b>
            </Typography>

            {/* Display submission status */}
            {submissionStatus?.message && (
                <Alert
                    severity={submissionStatus?.type}
                    sx={{ mb: 2 }}
                >
                    {submissionStatus?.message}
                </Alert>
            )}

            {/* Display detailed results if available */}
            {detailedResults?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h6">Submission Details:</Typography>
                    {detailedResults?.map((result, index) => (
                        <Typography
                            key={index}
                            variant="body2"
                            color={result.success ? 'success.main' : 'error.main'}
                        >
                            {result.methodKey}: {result.success ? 'Success' : `Failed - ${result.error}`}
                        </Typography>
                    ))}
                </Box>
            )}

            <Box
                display="grid"
                gridTemplateColumns={{ xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' }}
                gap={2}
                alignItems="center"
                mb={2}
            >
                {expenseKeys.map((key) => {
                    const { value, setter } = expenseStateMap[key];
                    return !capturing ? (
                        <TextField
                            key={key}
                            label={expenseLabelMap[key] || key}
                            variant="outlined"
                            fullWidth
                            size="small"
                            InputLabelProps={{
                                sx: {
                                    fontWeight: 'bold',
                                    fontSize: '1.3rem',
                                },
                            }}
                            value={formatCurrency(value)}
                            onChange={(e) => setter(e.target.value.replace(/\D/g, ''))}
                            inputProps={{ inputMode: 'tel' }}
                            onFocus={(e) => e.target.select()}
                            sx={{
                                color: 'white',
                                backgroundColor: 'white',
                                fontWeight: 'bold',
                                borderRadius: 1,
                                borderColor: 'white',
                                '& .MuiInputBase-input': {
                                    fontWeight: 'bold',
                                    textAlign: 'right',
                                },
                            }}
                        />
                    ) : (
                        <Box
                            key={key}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <FormLabel
                                sx={{
                                    color: 'white',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                }}
                            >
                                {key}
                            </FormLabel>
                            <br />
                            <Box
                                sx={{
                                    backgroundColor: 'white',
                                    color: 'black',
                                    borderRadius: '.5rem',
                                    p: '1rem',
                                }}
                            >
                                <Typography textAlign={'right'} fontWeight={'bold'} fontSize={'1.5rem'}>
                                    {value}
                                </Typography>
                            </Box>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};

export default ExpenseInputsSection;