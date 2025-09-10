// components/DebitSection.jsx
import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import LedgerSearchForm from '../CustomerSearch'; // Adjust path as needed
import CustomerFinencials from './CustomerFinencials'; // Adjust path as needed

const style = { backgroundColor: "white", borderRadius: "1rem", p: 1, mb: 2 };

export const DebitSection = ({
    onSelectDebit,
    onSetIsDebit,
    description,
    onDescriptionChange,
    cashAmountDisplay,
    onCashAmountChange,
    debitCust,
    descRef
}) => (
    <Box sx={{ backgroundColor: "red", color: "white", borderRadius: "1.5rem" }}>
        <Typography variant='h4' fontWeight={"bold"} p={2}>DEBIT</Typography>
        <Box sx={{ padding: "1rem", borderRadius: "2rem", }}>
            <Box sx={style}>
                <LedgerSearchForm
                    usage='paymentDebit'
                    formType="debit"
                    name="debit"
                    onSelect={onSelectDebit}
                    isCust={onSetIsDebit}
                />
            </Box>
            <Box
                sx={{
                    mb: ".5rem",
                    display: "flex",
                    gap: 1,
                }}
            >
                <TextField
                    label="Description of Transaction"
                    name="description"
                    inputRef={descRef}
                    value={description || ""}
                    onChange={onDescriptionChange}
                    sx={{
                        height: "100%",
                        backgroundColor: "white",
                        borderRadius: ".5rem",
                        "& .MuiInputBase-input": {
                            fontSize: "1.5rem",
                        }
                    }}
                    required
                />
                <TextField
                    label="Cash Amount"
                    name="cashAmount"
                    type="String"
                    value={cashAmountDisplay}
                    onChange={onCashAmountChange}
                    inputProps={{ inputMode: 'numeric' }}
                    sx={{
                        maxWidth: "30%",
                        borderRadius: ".5rem",
                        backgroundColor: "white",
                        "& .MuiInputBase-input": {
                            fontSize: "1.5rem",
                            textAlign: "right",
                        }
                    }}
                    required
                />
            </Box>
            <CustomerFinencials
                acid={debitCust ? debitCust.acid : ""}
                cashAmount={parseFloat(cashAmountDisplay?.replace(/,/g, '')) || 0}
            />
        </Box>
    </Box>
);