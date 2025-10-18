import React from 'react';
import { TextField, Box } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';

const handleKeyDown = (event, disabled, fn) => {
    if (event.key === 'Enter' && !disabled && fn) {
        fn();
    }
};


const LabelWithImage = ({ src, label }) => (
    <Box display="flex" alignItems="center" gap={1}>
        <img
            src={src}
            alt={label}
            width={label === 'CASH' ? 60 : 30}
            height={label === 'CASH' ? 35 : 30}
            style={{ objectFit: 'contain' }}
        />
        <span>{label}</span>
    </Box>
);

const textBoxStyle = {
    fontSize: '1.2rem',
    '& .MuiInputBase-input': {
        textAlign: 'right',
        fontSize: '1.5rem',
        paddingY: '12px',
    },
    '& .MuiInputLabel-root': {
        fontSize: '1rem',
    },
    '& .MuiOutlinedInput-root': {
        height: '60px',
    },
};

export const PaymentInputsSection = ({
    cashAmount,
    jazzcashAmount,
    onlineAmount,
    easypaisaAmount,
    crownWalletAmount,
    meezanBankAmount,
    onCashAmountChange,
    onJazzcashAmountChange,
    onOnlineAmountChange,
    onEasypaisaAmountChange,
    onCrownWalletAmountChange,
    onMeezanBankAmountChange,
    cashInputRef,
    onAddEntry,
}) => {
    const paymentMethods = [
        {
            key: "cash",
            label: "CASH",
            icon: "/icons/cash.png",
            value: cashAmount,
            onChange: onCashAmountChange,
            inputRef: cashInputRef,
        },
        {
            key: "jazzcash",
            label: "JAZZCASH",
            icon: "/icons/jazzcash.png",
            value: jazzcashAmount,
            onChange: onJazzcashAmountChange,
        },
        {
            key: "easypaisa",
            label: "EASYPAISA",
            icon: "/icons/easypaisa.png",
            value: easypaisaAmount,
            onChange: onEasypaisaAmountChange,
        },
        {
            key: "crownwallet",
            label: "CROWN WALLET",
            icon: "/icons/crownwallet.png",
            value: crownWalletAmount,
            onChange: onCrownWalletAmountChange,
        },
        {
            key: "meezan",
            label: "MEEZAN BANK",
            icon: "/icons/meezanbank.png",
            value: meezanBankAmount,
            onChange: onMeezanBankAmountChange,
        },
        {
            key: "online",
            label: "Direct Online",
            icon: null,
            value: onlineAmount,
            onChange: onOnlineAmountChange,
        },
    ];

    return (
        <Box
            sx={{
                textAlign: "center",
                mb: 2,
                display: "grid",
                gridTemplateColumns: {
                    xs: "repeat(3, 1fr)",
                    sm: "repeat(6, 1fr)",
                },
                gap: 1.5,
                alignItems: "center",
            }}
        >
            {paymentMethods.map((method) => (
                <TextField
                    key={method.key}
                    label={
                        method.icon ? (
                            <LabelWithImage src={method.icon} label={method.label} />
                        ) : (
                            method.label
                        )
                    }
                    variant="outlined"
                    fullWidth
                    onFocus={(e) => e.target.select()}
                    value={formatCurrency(method.value)} // ✅ will accept negative
                    onChange={method.onChange}
                    inputRef={method.inputRef}
                    onKeyDown={(event) => handleKeyDown(event, false, onAddEntry)} // ✅ all fields
                    inputProps={{ inputMode: "decimal" }}
                    sx={textBoxStyle}
                />
            ))}
        </Box>
    );
};

export default PaymentInputsSection;


