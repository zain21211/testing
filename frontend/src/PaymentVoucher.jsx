import React, { useState, useCallback } from 'react';
import { TextField, Button, Box, Typography } from '@mui/material';
import axios from 'axios';
import LedgerSearchForm from './CustomerSearch';
import CustomerFinencials from './components/CustomerFinencials'; // Assuming this is the correct import for your search 
import useLocalStorageState from 'use-local-storage-state';
import { useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { clearSelection } from './store/slices/CustomerSearch';

const url = import.meta.env.VITE_API_URL;
const formatCurrency = (value) => {
    if (value === "" || value === null || value === undefined) {
        return "";
    }
    const rawNumericString = String(value).replace(/,/g, "");
    if (rawNumericString.trim() === "") {
        return "";
    }
    const num = Number(rawNumericString);
    if (isNaN(num)) {
        return "";
    }
    return num.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
};

const style = { backgroundColor: "white", borderRadius: "1rem", p: 1, mb: 2 }
const PaymentVoucher = () => {
    const [formData, setFormData] = useState({
        accountCode1: '',
        accountCode2: '',
        cashAmount: '',
        description: '',
    });

    const [isCredit, setIsCredit] = useState(true);
    const [isDebit, setIsDebit] = useState(true)
    const user = JSON.parse(localStorage.getItem("user"));
    const [creditCust, setCreditCust] = useState(null);
    const [debitCust, setDebitCust] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [displayValue, setDisplayValue] = useState(null)
    const location = useLocation(); // Get current route
    const routePath = location.pathname; // Get the current path
    const [debitID, setDebitID] = useLocalStorageState(`accountIDdebit${routePath}`,
        null
    )

    const descRef = useRef(null);

    useEffect(() => {
        console.log("entering")
        //   if (descRef?.current && (debitCust || creditCust)) {
        console.log(descRef?.current);
        setTimeout(() => {
            descRef.current?.focus();
        }, 50); // or 0, 100 depending on render timing
        //   }
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleCredit = (flag) => {
        setIsCredit(flag)
    }
    const handleDebit = (flag) => {
        setIsDebit(flag)
    }
    // Handle Submit
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(false);

        const accounts = [{
            type: "debit",
            acid: debitCust?.acid || null,
        },
        {
            type: "credit",
            acid: creditCust?.acid || null,
        }];
        console.log(accounts)
        try {
            const response = await axios.post(`${url}/customers/post`, {
                accounts,
                entryBy: "zain",
                date: new Date(),
                user: user.username,
                entryDateTime: new Date(),
                description: formData.description,
                amount: parseFloat(displayValue.replace(/,/g, '')) || 0,
            });

            if (response.status !== 200) {
                throw new Error(`Failed on account`);
            }

            setSuccess(true);
            setDebitID(null);
            setDisplayValue(null);
            clearSelection({ key: `paymentDebit` })
            clearSelection({ key: `paymentCredit` })

        } catch (err) {
            setError('An error occurred while submitting the form. Please try again.');
            console.error('API call failed:', err);
        } finally {
            setSubmitting(false);
        }
    };


    // for getting customer details
    const getCreditCusts = useCallback(
        (customer) => {
            console.log("credit cust: ", customer)
            setCreditCust(customer);
        },
        [creditCust]
    );

    const getDebitCusts = useCallback(
        (customer) => {
            setDebitCust(customer);
        },
        [debitCust]
    );

    return (
        <>
            {(isCredit || isDebit) && (
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        margin: 'auto',
                        padding: 3,
                        boxShadow: 3,
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h5" component="h2" gutterBottom>
                        Cash Payment Voucher
                    </Typography>

                    {/* for credit */}
                    {isCredit && (
                        <Box sx={{ backgroundColor: "green", color: "white", borderRadius: "1.5rem" }}>
                            <Typography variant='h4' fontWeight={"bold"} p={2}>CREDIT</Typography>
                            <Box sx={{ padding: "1rem", borderRadius: "2rem" }}>
                                <Box sx={style}>
                                    < LedgerSearchForm
                                        usage={"paymentCredit"}
                                        onSelect={getCreditCusts}
                                        formType="credit"
                                        isCust={handleCredit}
                                    />
                                </Box>

                            </Box>
                        </Box>
                    )}
                    {/* for debit */}
                    {isDebit && (
                        <Box sx={{ backgroundColor: "red", color: "white", borderRadius: "1.5rem" }}>
                            <Typography variant='h4' fontWeight={"bold"} p={2}>DEBIT</Typography>

                            <Box sx={{ padding: "1rem", borderRadius: "2rem", }}>
                                <Box sx={style}>
                                    < LedgerSearchForm
                                        usage='paymentDebit'
                                        formType="debit"
                                        name="debit"
                                        onSelect={getDebitCusts}
                                        isCust={handleDebit}
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
                                        value={formData.description}
                                        onChange={handleChange}
                                        sx={{
                                            height: "100%",
                                            backgroundColor: "white",
                                            borderRadius: ".5rem",
                                            "& .MuiInputBase-input": {
                                                fontSize: "1.5rem",
                                            }

                                        }}
                                        // multiline
                                        required
                                    />
                                    <TextField
                                        label="Cash Amount"
                                        name="cashAmount"
                                        type="String"
                                        value={displayValue}
                                        onChange={e => {
                                            const value = e.target.value;
                                            const formatted = formatCurrency(value)
                                            setDisplayValue(formatted)
                                            handleChange(e)
                                        }}
                                        inputProps={{ inputMode: 'numeric' }}
                                        sx={{
                                            maxWidth: "30%",
                                            borderRadius: ".5rem",
                                            backgroundColor: "white",
                                            // m: "auto",
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
                                    cashAmount={parseFloat(displayValue?.replace(/,/g, '')) || 0}
                                />
                            </Box>
                        </Box>
                    )}
                    {/* FORM DATA */}
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={submitting}
                        sx={{
                            fontSize: "2rem",
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Submit'}
                    </Button>

                    {success && (
                        <Typography color="success.main" sx={{ mt: 2 }}>
                            Voucher submitted successfully!
                        </Typography>
                    )}
                    {error && (
                        <Typography color="error" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                </Box>
            )}
            {(!isCredit && !isDebit) && (
                <Typography>
                    unauthorized
                </Typography>
            )}
        </>
    );
};

export default PaymentVoucher;