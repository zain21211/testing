import React, { useState, useRef } from 'react';
import { TextField, Box, Button, Typography, IconButton, Dialog, DialogContent } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import { AddAPhoto, Delete, Close } from '@mui/icons-material';

const handleKeyDown = (event, disabled, fn) => {
    if (event.key === 'Enter' && !disabled && fn) {
        fn();
    }
};


const LabelWithImage = ({ src, label }) => (
    <Box display="flex" alignItems="center" gap={1}>
        {src && (
            <img
                src={src}
                alt={label}
                width={label === 'CASH' ? 60 : 30}
                height={label === 'CASH' ? 35 : 30}
                style={{ objectFit: 'contain' }}
            />
        )}
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
    tcAmount,
    harrAmount,
    crownFitAmount,
    meezanBankAmount,
    paymentImage,
    onCashAmountChange,
    onJazzcashAmountChange,
    onOnlineAmountChange,
    onEasypaisaAmountChange,
    onCrownWalletAmountChange,
    onMeezanBankAmountChange,
    onTcAmountChange,
    onHarrAmountChange,
    onCrownFitAmountChange,
    onPaymentImageChange = () => {},
    cashInputRef,
    onAddEntry,
    showMore,
}) => {
    const [previewOpen, setPreviewOpen] = useState(false);
    const fileInputRef = useRef(null);

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
            key: "tc",
            label: "TC",
            icon: null,
            value: tcAmount,
            onChange: onTcAmountChange,
        },
        {
            key: "crownfit",
            label: "CROWN FIT",
            icon: null,
            value: crownFitAmount,
            onChange: onCrownFitAmountChange,
        },
        {
            key: "meezan",
            label: "MEEZAN BANK",
            icon: "/icons/meezanbank.png",
            value: meezanBankAmount,
            onChange: onMeezanBankAmountChange,
        },
        {
            key: "crownwallet",
            label: "CROWN WALLET",
            icon: "/icons/crownwallet.png",
            value: crownWalletAmount,
            onChange: onCrownWalletAmountChange,
        },
        {
            key: "harr",
            label: "HARR",
            icon: null,
            value: harrAmount,
            onChange: onHarrAmountChange,
        },
        {
            key: "online",
            label: "Direct Online",
            icon: null,
            value: onlineAmount,
            onChange: onOnlineAmountChange,
        },
    ];

    const shownMethods = showMore ? paymentMethods : paymentMethods.slice(0, 3);

    const compressImage = (dataUrl, callback) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Max dimension 1000px for balance between quality and size
            const MAX_SIZE = 1000;
            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Compress to JPEG with 0.6 quality to aim for < 100KB
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            callback(compressedDataUrl);
        };
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                compressImage(reader.result, (compressedResult) => {
                    if (typeof onPaymentImageChange === 'function') {
                        onPaymentImageChange(compressedResult);
                        setPreviewOpen(true);
                    }
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const isImageRequired = (parseFloat(tcAmount) > 0 || parseFloat(crownFitAmount) > 0 || parseFloat(meezanBankAmount) > 0 || parseFloat(harrAmount) > 0);
    const isImageSectionVisible = showMore;

    return (
        <Box sx={{ mb: 2 }}>
            <Box
                sx={{
                    textAlign: "center",
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(3, 1fr)",
                        sm: "repeat(6, 1fr)",
                    },
                    gap: 1.5,
                    alignItems: "center",
                }}
            >
                {shownMethods.map((method) => (
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
                        value={formatCurrency(method.value)}
                        onChange={method.onChange}
                        inputRef={method.inputRef}
                        onKeyDown={(event) => handleKeyDown(event, false, onAddEntry)}
                        inputProps={{ inputMode: "decimal" }}
                        sx={{
                            ...textBoxStyle,
                            backgroundColor: (method.value === '' || method.value === '0') ? '#f0f0f0' : 'white',
                        }}
                    />
                ))}
            </Box>

            {isImageSectionVisible && (
                <Box
                    sx={{
                        mt: 2,
                        p: 2,
                        border: '2px dashed',
                        borderColor: isImageRequired ? (paymentImage ? 'success.main' : 'warning.main') : 'info.main',
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 1,
                        bgcolor: isImageRequired ? (paymentImage ? '#f6fff6' : '#fffaf0') : '#f0f7ff',
                        cursor: 'pointer',
                        transition: '0.3s',
                        '&:hover': {
                            bgcolor: isImageRequired ? (paymentImage ? '#eeffee' : '#fff5e6') : '#e6f2ff',
                        }
                    }}
                    onClick={triggerFileInput}
                >
                    <input
                        type="file"
                        hidden
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    {paymentImage ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', justifyContent: 'center' }}>
                            <img
                                src={paymentImage}
                                alt="Receipt"
                                style={{
                                    width: 80,
                                    height: 80,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    cursor: 'zoom-in',
                                    border: '2px solid #4caf50'
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPreviewOpen(true);
                                }}
                            />
                            <Box onClick={triggerFileInput} sx={{ flex: 1, cursor: 'pointer' }}>
                                <Typography variant="subtitle1" color="success.main" fontWeight="bold">
                                    Receipt Image Uploaded ✅
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Click here to change image (or image to preview)
                                </Typography>
                            </Box>
                            <IconButton
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof onPaymentImageChange === 'function') {
                                        onPaymentImageChange(null);
                                    }
                                }}
                                size="small"
                                sx={{ ml: 2 }}
                            >
                                <Delete />
                            </IconButton>
                        </Box>
                    ) : (
                        <>
                            <AddAPhoto sx={{ fontSize: 40, color: isImageRequired ? 'warning.main' : 'info.main' }} />
                            <Typography variant="body1" fontWeight="bold" color={isImageRequired ? 'warning.dark' : 'info.dark'}>
                                Receipt Image {isImageRequired ? "Required *" : "Optional"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Please upload a screenshot/pic for {isImageRequired ? "TC, Crown Fit, Meezan Bank, or Harr" : "Crown Wallet"}
                            </Typography>
                        </>
                    )}
                </Box>
            )}

            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'white', display: 'flex', justifyContent: 'center', minHeight: '200px' }}>
                    <IconButton
                        onClick={() => setPreviewOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 1 }}
                    >
                        <Close />
                    </IconButton>
                    {paymentImage && (
                        <img
                            src={paymentImage}
                            alt="Full Preview"
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default PaymentInputsSection;
