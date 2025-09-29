import React from 'react';
import { Box, Typography, TextField } from '@mui/material';
import LedgerSearchForm from '../CustomerSearch'; // Adjust path as needed
import { cleanNumbers } from '../utils/cleanString';
import CustomerFinencials from './CustomerFinencials'; // Adjust path as needed

const style = { backgroundColor: "white", borderRadius: "1rem", p: 1, mb: 2 };



export const CreditSection = ({ onSelectCredit, onSetIsCredit, isCust, isDebit, description,
    onDescriptionChange,
    cashAmountDisplay,
    onCashAmountChange,
    creditCust,
    descRef, }) => {
    const user = JSON.parse(localStorage.getItem("user"));
    const color = user?.username.toLowerCase().includes('ssana') ? "red" : 'green';
    return (
        <Box sx={{ backgroundColor: color, color: "white", borderRadius: "1.5rem", display: isCust ? 'block' : 'none' }}>
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
                <Box sx={{ display: isDebit ? 'none' : "block", }}>

                    <Box
                        sx={{
                            mb: ".5rem",
                            display: isDebit ? 'none' : "flex",
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
                        acid={creditCust ? creditCust.acid : ""}
                        cashAmount={cleanNumbers(cashAmountDisplay) || 0}
                    />
                </Box>
            </Box>
        </Box>
    )
};
