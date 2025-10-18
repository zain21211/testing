import React from 'react';
import { Box, Typography } from '@mui/material';
import { usePayVouForm } from './hooks/usePayVouFrom';
import { usePayVouCust } from './hooks/usePayVouCust';
import { usePayVouSub } from './hooks/usePayVouSub';
import { PayVouForm } from './components/payVouForm';
import { useDispatch } from 'react-redux';
import { setSelectedCustomer } from './store/slices/CustomerSearch';


const PaymentVoucher = () => {
    const dispatch = useDispatch();

    const {
        creditCust,
        debitCust,
        debitOptions,
        creditOptions,
        isCredit = true,
        isDebit = true,
        getCreditCusts,
        getDebitCusts,
        handleCreditFlag,
        handleDebitFlag,
        clearCustomerSelections,
    } = usePayVouCust();

    const {
        formData,
        displayValue,
        descRef,
        handleChange,
        handleCashAmountChange,
        clearForm,
    } = usePayVouForm(isCredit || isDebit);

    const {
        submitting,
        error,
        success,
        entries,
        handleSubmit: submitVoucher,
    } = usePayVouSub({
        onSubmissionSuccess: () => {
            clearForm();
            descRef?.current?.focus();
            console.log('before', { isCredit, isDebit, creditOptions, debitOptions });
            clearCustomerSelections();
            console.log('after', { isCredit, isDebit, creditOptions, debitOptions });
            if (!isCredit && !isDebit) return;
            if (creditOptions.length === 1) {
                const customerKey = 'paymentCredit';
                const customer = creditOptions[0];
                getCreditCusts(customer);
                dispatch(setSelectedCustomer({ key: customerKey, customer }));

            }
            if (debitOptions.length === 1) {
                const customerKey = 'paymentDebit';
                const customer = debitOptions[0];
                getDebitCusts(customer);
                dispatch(setSelectedCustomer({ key: customerKey, customer }));
            }
        },
    });

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
                    entries={entries}
                    onSelectCredit={getCreditCusts}
                    onSetIsCredit={handleCreditFlag}
                    onSelectDebit={getDebitCusts}
                    onSetIsDebit={handleDebitFlag}
                    description={formData.description}
                    onDescriptionChange={handleChange}
                    cashAmountDisplay={displayValue}
                    onCashAmountChange={handleCashAmountChange}
                    debitCust={debitCust}
                    creditCust={creditCust}
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