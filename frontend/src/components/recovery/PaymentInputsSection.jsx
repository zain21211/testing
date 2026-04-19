import React, { useState, useRef } from 'react';
import { TextField, Box, Button, Typography, IconButton, Dialog, DialogContent } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import { AddAPhoto, Delete, Close, PhotoCamera, Collections, Check } from '@mui/icons-material';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

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
                width={label === 'CASH' ? 40 : 24}
                height={label === 'CASH' ? 24 : 24}
                style={{ objectFit: 'contain' }}
            />
        )}
        <span style={{ fontSize: '0.85rem' }}>{label}</span>
    </Box>
);

const textBoxStyle = {
    fontSize: '1rem',
    '& .MuiInputBase-input': {
        textAlign: 'right',
        fontSize: '1.2rem',
        paddingY: '8px',
    },
    '& .MuiInputLabel-root': {
        fontSize: '0.9rem',
    },
    '& .MuiOutlinedInput-root': {
        height: '45px',
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
    paymentImages,
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
    const [previewImageSrc, setPreviewImageSrc] = useState(null);
    const [uploadMethodKey, setUploadMethodKey] = useState(null);
    
    // Cropper States
    const [cropSrc, setCropSrc] = useState(null);
    const [cropMethodKey, setCropMethodKey] = useState(null);
    const cropperRef = useRef(null);

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
            key: "crownWallet",
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
            key: "meezanBank",
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

    const shownMethods = showMore ? paymentMethods : paymentMethods.slice(0, 3);

    const compressImage = (dataUrl, callback) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_SIZE = 800;
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

            let quality = 0.7;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            while (compressedDataUrl.length > 135000 && quality > 0.2) {
                quality -= 0.1;
                compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }

            callback(compressedDataUrl);
        };
    };

    const handleFileChange = (event, methodKey) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCropSrc(reader.result);
                setCropMethodKey(methodKey);
                setUploadMethodKey(null);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = '';
    };

    const handleCropSave = () => {
        if (typeof cropperRef.current?.cropper !== "undefined") {
            const croppedCanvas = cropperRef.current.cropper.getCroppedCanvas();
            const croppedDataUrl = croppedCanvas.toDataURL('image/jpeg');
            
            compressImage(croppedDataUrl, (compressedResult) => {
                if (typeof onPaymentImageChange === 'function') {
                    onPaymentImageChange(cropMethodKey, compressedResult);
                    setPreviewImageSrc(compressedResult);
                    setPreviewOpen(true);
                }
                setCropSrc(null);
                setCropMethodKey(null);
            });
        }
    };

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {shownMethods.map((method) => {
                    const isRequired = method.key !== 'cash';
                    const methodImage = paymentImages?.[method.key] || null;
                    const hasValue = method.value && method.value !== '0' && method.value !== '';
                    
                    let buttonColor = 'primary';
                    if (isRequired && hasValue && !methodImage) buttonColor = 'warning';
                    if (methodImage) buttonColor = 'success';

                    return (
                        <Box key={method.key} sx={{ 
                            display: 'grid', 
                            gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: '1fr auto 80px' }, 
                            gap: { xs: 1, sm: 2 }, 
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: hasValue ? '#fafafa' : 'transparent',
                            border: hasValue && isRequired && !methodImage ? '1px dashed #ed6c02' : 'none'
                        }}>
                            {/* 1. Payment Input */}
                            <TextField
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
                                    backgroundColor: (!hasValue) ? '#f0f0f0' : 'white',
                                }}
                            />

                            {/* 2. Upload Button */}
                            <Button 
                                variant="contained" 
                                color={buttonColor}
                                onClick={() => setUploadMethodKey(method.key)}
                                sx={{ height: '60px', width: { xs: '100%', sm: 'auto' }, minWidth: { xs: 'unset', sm: '180px' }, px: { xs: 1, sm: 2 } }}
                            >
                                <Typography variant="button" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' }, lineHeight: 1.2, textAlign: 'center', fontWeight: 'bold' }}>
                                    {methodImage ? "Change" : (isRequired ? "Upload *" : "Upload")}
                                </Typography>
                            </Button>

                            {/* 3. Image Preview */}
                            <Box sx={{ 
                                width: { xs: '100%', sm: 80 }, 
                                height: 60, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: '#f5f5f5'
                            }}>
                                {methodImage ? (
                                    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <img 
                                            src={methodImage} 
                                            alt={`${method.label} Preview`} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                                            onClick={() => {
                                                setPreviewImageSrc(methodImage);
                                                setPreviewOpen(true);
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            sx={{ position: 'absolute', top: -5, right: -5, bgcolor: 'rgba(255,255,255,0.8)', padding: '2px', '&:hover': { bgcolor: 'rgba(255,100,100,0.9)', color: 'white' } }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPaymentImageChange(method.key, null);
                                            }}
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="textSecondary">No Image</Typography>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

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
                        <Check />
                    </IconButton>
                    {previewImageSrc && (
                        <img
                            src={previewImageSrc}
                            alt="Full Preview"
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={!!uploadMethodKey} onClose={() => setUploadMethodKey(null)} maxWidth="xs" fullWidth>
                <DialogContent>
                    <Typography variant="h6" align="center" gutterBottom>
                        Select Image Source
                    </Typography>
                    <Box display="flex" justifyContent="space-evenly" mt={4} mb={2}>
                        <Button
                            variant="contained"
                            component="label"
                            color="primary"
                            sx={{ display: 'flex', flexDirection: 'column', width: 120, height: 100, gap: 1 }}
                        >
                            <PhotoCamera fontSize="large" />
                            Camera
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                capture="environment"
                                onChange={(e) => handleFileChange(e, uploadMethodKey)}
                            />
                        </Button>
                        <Button
                            variant="outlined"
                            component="label"
                            color="secondary"
                            sx={{ display: 'flex', flexDirection: 'column', width: 120, height: 100, gap: 1 }}
                        >
                            <Collections fontSize="large" />
                            Gallery
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, uploadMethodKey)}
                            />
                        </Button>
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Cropper Dialog */}
            <Dialog open={!!cropSrc} onClose={() => { setCropSrc(null); setCropMethodKey(null); }} maxWidth="sm" fullWidth>
                <DialogContent sx={{ p: 0, bgcolor: 'black', height: '60vh', display: 'flex', flexDirection: 'column' }}>
                    {cropSrc && (
                        <Cropper
                            src={cropSrc}
                            style={{ flexGrow: 1, width: '100%', maxHeight: '60vh' }}
                            initialAspectRatio={null}
                            guides={true}
                            ref={cropperRef}
                            viewMode={1}
                            background={false}
                            responsive={true}
                            autoCropArea={1}
                            checkOrientation={false}
                        />
                    )}
                </DialogContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: '#f5f5f5' }}>
                    <Button variant="outlined" color="error" onClick={() => { setCropSrc(null); setCropMethodKey(null); }}>
                        Cancel
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleCropSave}>
                        Crop & Save
                    </Button>
                </Box>
            </Dialog>
        </Box>
    );
};

export default PaymentInputsSection;
