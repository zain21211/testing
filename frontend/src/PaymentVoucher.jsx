import React from 'react';
import { Box, Typography } from '@mui/material';
import { usePayVouForm } from './hooks/usePayVouFrom';
import { usePayVouCust } from './hooks/usePayVouCust';
import { usePayVouSub } from './hooks/usePayVouSub';
import { PayVouForm } from './components/payVouForm';


const PaymentVoucher = () => {
    const {
        formData,
        displayValue,
        descRef,
        handleChange,
        handleCashAmountChange,
        clearForm,
    } = usePayVouForm();

    const {
        creditCust,
        debitCust,
        isCredit = true,
        isDebit = true,
        getCreditCusts,
        getDebitCusts,
        handleCreditFlag,
        handleDebitFlag,
        clearCustomerSelections,
    } = usePayVouCust();

    const {
        submitting,
        error,
        success,
        handleSubmit: submitVoucher,
    } = usePayVouSub();

    const handleVoucherSubmit = async (event) => {
        event.preventDefault();
        const cashAmount = parseFloat(displayValue?.replace(/,/g, '')) || 0;

        submitVoucher({
            description: formData.description,
            amount: cashAmount,
            debitCust,
            creditCust,
            onSubmissionSuccess: () => {
                clearForm();
                descRef?.current?.focus();
                // clearCustomerSelections();
            },
        });
    };

    return (
        <Box>
            <Box mb={2} display={(!isCredit && !isDebit) ? 'none' : 'block'} >
                <PayVouForm
                    isCredit={isCredit}
                    isDebit={isDebit}
                    onSelectCredit={getCreditCusts}
                    onSetIsCredit={handleCreditFlag}
                    onSelectDebit={getDebitCusts}
                    onSetIsDebit={handleDebitFlag}
                    description={formData.description}
                    onDescriptionChange={handleChange}
                    cashAmountDisplay={displayValue}
                    onCashAmountChange={handleCashAmountChange}
                    debitCust={debitCust}
                    descRef={descRef}
                    onSubmit={handleVoucherSubmit}
                    submitting={submitting}
                    success={success}
                    error={error}
                />
            </Box>
            {
                (!isCredit && !isDebit) &&
                (
                    <Typography>
                        unauthorized
                    </Typography>
                )
            }
        </Box>
    );
};

export default PaymentVoucher;