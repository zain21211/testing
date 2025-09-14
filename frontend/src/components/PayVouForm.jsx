import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { CreditSection } from './CreditSection';
import { DebitSection } from './DebitSection';
import { formatCurrency } from '../utils/formatCurrency';

export const PayVouForm = ({
    isCredit,
    isDebit,
    onSelectCredit,
    onSetIsCredit,
    onSelectDebit,
    onSetIsDebit,
    description,
    onDescriptionChange,
    cashAmountDisplay,
    onCashAmountChange,
    debitCust,
    descRef,
    onSubmit,
    submitting,
    success,
    error,
}) => (
    <Box
        component="form"
        onSubmit={onSubmit}
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
            Payment Voucher
        </Typography>

        <CreditSection
            onSelectCredit={onSelectCredit}
            onSetIsCredit={onSetIsCredit}
            isCust={isCredit}
        />

        <DebitSection
            onSelectDebit={onSelectDebit}
            isCust={isDebit}
            onSetIsDebit={onSetIsDebit}
            description={description}
            onDescriptionChange={onDescriptionChange}
            cashAmountDisplay={cashAmountDisplay}
            onCashAmountChange={onCashAmountChange}
            debitCust={debitCust}
            descRef={descRef}
        />

        <Button
            type="submit"
            variant="contained"
            disabled={submitting || (!isCredit && !isDebit)}
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
);