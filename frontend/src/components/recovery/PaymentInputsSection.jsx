import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    TextField, Box, Button, Typography, IconButton,
    Dialog, DialogContent, CircularProgress
} from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import { Close, PhotoCamera, Collections, Check } from '@mui/icons-material';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

// ─────────────────────────────────────────────────────────────
// Tune these constants to trade quality vs memory
// ─────────────────────────────────────────────────────────────

/** Longest side (px) fed INTO CropperJS — keeps its internal clone small */
const PRE_CROP_MAX_PX = 1200;
const PRE_CROP_QUALITY = 0.55;

/** Longest side (px) of the final thumbnail stored in state / sent to parent */
const FINAL_MAX_PX = 900;
const FINAL_QUALITY = 0.55;

/** Max base64 chars (~160 KB unencoded) — quality loop falls back to this */
const TARGET_B64_CHARS = 220_000;

// ─────────────────────────────────────────────────────────────
// Pure helper — no hooks, no closures over component state.
// Draws src into an off-screen canvas, scales it, exports JPEG,
// then IMMEDIATELY destroys the canvas to free the pixel buffer.
// Returns Promise<string> (data-URL).
// ─────────────────────────────────────────────────────────────
const compressToDataUrl = (src, maxPx, quality) =>
    new Promise((resolve, reject) => {
        const img = new window.Image();

        img.onload = () => {
            let { width, height } = img;

            // Scale down proportionally to maxPx on the longest side
            if (width > height) {
                if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx; }
            } else {
                if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx; }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Quality fallback loop — stay under TARGET_B64_CHARS
            let q = quality;
            let dataUrl = canvas.toDataURL('image/jpeg', q);
            while (dataUrl.length > TARGET_B64_CHARS && q > 0.15) {
                q = Math.max(q - 0.1, 0.15);
                dataUrl = canvas.toDataURL('image/jpeg', q);
            }

            // *** Force-release canvas pixel buffer immediately ***
            canvas.width = 0;
            canvas.height = 0;

            // *** Release Image src ***
            img.onload = null;
            img.onerror = null;
            img.src = '';

            resolve(dataUrl);
        };

        img.onerror = () => {
            img.onload = null;
            img.onerror = null;
            img.src = '';
            reject(new Error('Image failed to load for compression'));
        };

        img.src = src;
    });

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

const handleKeyDown = (event, disabled, fn) => {
    if (event.key === 'Enter' && !disabled && fn) fn();
};

const LabelWithImage = ({ src, label }) => (
    <Box display="flex" alignItems="center" gap={1}>
        {src && (
            <img
                src={src}
                alt={label}
                width={label === 'CASH' ? 40 : 24}
                height={24}
                style={{ objectFit: 'contain' }}
            />
        )}
        <span style={{ fontSize: '0.85rem' }}>{label}</span>
    </Box>
);

const textBoxStyle = {
    fontSize: '1rem',
    '& .MuiInputBase-input': { textAlign: 'right', fontSize: '1.2rem', paddingY: '8px' },
    '& .MuiInputLabel-root': { fontSize: '0.9rem' },
    '& .MuiOutlinedInput-root': { height: '45px' },
};

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────

export const PaymentInputsSection = ({
    cashAmount, jazzcashAmount, onlineAmount, easypaisaAmount,
    crownWalletAmount, tcAmount, harrAmount, crownFitAmount, meezanBankAmount,
    paymentImages,
    onCashAmountChange, onJazzcashAmountChange, onOnlineAmountChange,
    onEasypaisaAmountChange, onCrownWalletAmountChange, onMeezanBankAmountChange,
    onTcAmountChange, onHarrAmountChange, onCrownFitAmountChange,
    onPaymentImageChange = () => { },
    cashInputRef, onAddEntry, showMore,
}) => {

    // ── UI state ──────────────────────────────────────────────
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImageSrc, setPreviewImageSrc] = useState(null);
    const [uploadMethodKey, setUploadMethodKey] = useState(null);

    // ── Cropper state ─────────────────────────────────────────
    // cropSrc is ALWAYS a compressed data-URL — never a raw blob / object-URL
    const [cropSrc, setCropSrc] = useState(null);
    const [cropMethodKey, setCropMethodKey] = useState(null);
    const [isCompressing, setIsCompressing] = useState(false); // pre-crop spinner
    const [isSaving, setIsSaving] = useState(false); // post-crop spinner

    const cropperRef = useRef(null);

    // Track the latest active object-URL so we can always revoke it even on error
    const activeObjectUrlRef = useRef(null);

    const revokeActiveObjectUrl = useCallback(() => {
        if (activeObjectUrlRef.current) {
            URL.revokeObjectURL(activeObjectUrlRef.current);
            activeObjectUrlRef.current = null;
        }
    }, []);

    // Safety-net revoke on unmount
    useEffect(() => () => revokeActiveObjectUrl(), [revokeActiveObjectUrl]);

    // ── Payment methods config ────────────────────────────────
    const paymentMethods = [
        { key: 'cash', label: 'CASH', icon: '/icons/cash.png', value: cashAmount, onChange: onCashAmountChange, inputRef: cashInputRef },
        { key: 'jazzcash', label: 'JAZZCASH', icon: '/icons/jazzcash.png', value: jazzcashAmount, onChange: onJazzcashAmountChange },
        { key: 'easypaisa', label: 'EASYPAISA', icon: '/icons/easypaisa.png', value: easypaisaAmount, onChange: onEasypaisaAmountChange },
        { key: 'crownWallet', label: 'CROWN WALLET', icon: '/icons/crownwallet.png', value: crownWalletAmount, onChange: onCrownWalletAmountChange },
        { key: 'harr', label: 'HARR', icon: null, value: harrAmount, onChange: onHarrAmountChange },
        { key: 'tc', label: 'TC', icon: null, value: tcAmount, onChange: onTcAmountChange },
        { key: 'crownfit', label: 'CROWN FIT', icon: null, value: crownFitAmount, onChange: onCrownFitAmountChange },
        { key: 'meezanBank', label: 'MEEZAN BANK', icon: '/icons/meezanbank.png', value: meezanBankAmount, onChange: onMeezanBankAmountChange },
        { key: 'online', label: 'Direct Online', icon: null, value: onlineAmount, onChange: onOnlineAmountChange },
    ];

    const shownMethods = showMore ? paymentMethods : paymentMethods.slice(0, 3);

    // ─────────────────────────────────────────────────────────
    // FILE SELECTED → compress first → then open cropper
    //
    // Memory timeline:
    //   File → object-URL (lives only during compressToDataUrl)
    //        ← revoked immediately after compress resolves
    //        → compressed data-URL (PRE_CROP_MAX_PX / PRE_CROP_QUALITY)
    //        → CropperJS receives the small data-URL, never the raw file
    // ─────────────────────────────────────────────────────────
    const handleFileChange = useCallback(async (event, methodKey) => {
        const file = event.target.files?.[0];
        event.target.value = ''; // reset immediately so same file can be re-selected later

        if (!file) return;

        if (file.size > 25 * 1024 * 1024) {
            alert('File too large (max 25 MB). Please use a lower-resolution photo.');
            return;
        }

        setUploadMethodKey(null); // close source-picker dialog right away
        setIsCompressing(true);   // show spinner while we compress

        const objectUrl = URL.createObjectURL(file);
        activeObjectUrlRef.current = objectUrl;

        try {
            // *** Compress BEFORE handing anything to CropperJS ***
            // CropperJS clones the image internally on mount, so a 12 MP feed
            // would exist as ~4 simultaneous copies in GPU/CPU memory.
            // Feeding a pre-compressed data-URL keeps all CropperJS internals small.
            const preCropDataUrl = await compressToDataUrl(
                objectUrl,
                PRE_CROP_MAX_PX,
                PRE_CROP_QUALITY,
            );

            // *** Revoke object-URL NOW — before setting any state ***
            // We have a data-URL so the underlying Blob is no longer needed.
            revokeActiveObjectUrl();

            setCropMethodKey(methodKey);
            setCropSrc(preCropDataUrl); // only now open the cropper
        } catch (err) {
            revokeActiveObjectUrl();
            console.error('Pre-crop compression failed:', err);
            alert('Could not load image. Please try again.');
        } finally {
            setIsCompressing(false);
        }
    }, [revokeActiveObjectUrl]);

    // ─────────────────────────────────────────────────────────
    // CROP CONFIRMED → export canvas → compress to thumbnail
    //
    // Memory timeline:
    //   getCroppedCanvas (hard cap at FINAL_MAX_PX)
    //     → toDataURL directly — no second Image() round-trip needed
    //     → destroy canvas pixel buffer immediately
    //     → setCropSrc(null) FIRST — unmounts CropperJS, frees its internals
    //     → only then push thumbnail to parent + show preview
    // ─────────────────────────────────────────────────────────
    const handleCropSave = useCallback(async () => {
        const cropperInstance = cropperRef.current?.cropper;
        if (!cropperInstance) return;

        setIsSaving(true);

        try {
            // Hard canvas size cap prevents CropperJS producing a huge bitmap
            const croppedCanvas = cropperInstance.getCroppedCanvas({
                maxWidth: FINAL_MAX_PX,
                maxHeight: FINAL_MAX_PX,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'medium',
                fillColor: '#fff',
            });

            if (!croppedCanvas) throw new Error('getCroppedCanvas returned null');

            // Export directly from canvas — no second Image() round-trip
            let q = FINAL_QUALITY;
            let dataUrl = croppedCanvas.toDataURL('image/jpeg', q);
            while (dataUrl.length > TARGET_B64_CHARS && q > 0.15) {
                q = Math.max(q - 0.1, 0.15);
                dataUrl = croppedCanvas.toDataURL('image/jpeg', q);
            }

            // *** Destroy cropped canvas pixel buffer immediately ***
            croppedCanvas.width = 0;
            croppedCanvas.height = 0;

            // *** Clear cropSrc FIRST — unmounts CropperJS before new state is set ***
            // This frees CropperJS's internal <img> src + canvas before the
            // thumbnail data starts propagating through parent state.
            const savedMethodKey = cropMethodKey;
            setCropSrc(null);
            setCropMethodKey(null);

            // Now safe to push the thumbnail upward and show preview
            onPaymentImageChange(savedMethodKey, dataUrl);
            setPreviewImageSrc(dataUrl);
            setPreviewOpen(true);

        } catch (err) {
            console.error('Crop/compress failed:', err);
            alert('Could not process image. Please try again.');
            setCropSrc(null);
            setCropMethodKey(null);
        } finally {
            setIsSaving(false);
        }
    }, [cropMethodKey, onPaymentImageChange]);

    // Cancel without saving — just clear cropSrc to unmount CropperJS
    const handleCropCancel = useCallback(() => {
        setCropSrc(null);
        setCropMethodKey(null);
    }, []);

    // ─────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────

    return (
        <Box sx={{ mb: 2 }}>

            {/* ── Payment rows ── */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {shownMethods.map((method) => {
                    const isRequired = method.key !== 'cash';
                    const methodImage = paymentImages?.[method.key] ?? null;
                    const hasValue = method.value && method.value !== '0' && method.value !== '';

                    let buttonColor = 'primary';
                    if (isRequired && hasValue && !methodImage) buttonColor = 'warning';
                    if (methodImage) buttonColor = 'success';

                    return (
                        <Box
                            key={method.key}
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: '1fr auto 80px' },
                                gap: { xs: 1, sm: 2 },
                                alignItems: 'center',
                                p: 1,
                                borderRadius: 1,
                                backgroundColor: hasValue ? '#fafafa' : 'transparent',
                                border: hasValue && isRequired && !methodImage
                                    ? '1px dashed #ed6c02' : 'none',
                            }}
                        >
                            {/* 1. Amount input */}
                            <TextField
                                label={
                                    method.icon
                                        ? <LabelWithImage src={method.icon} label={method.label} />
                                        : method.label
                                }
                                variant="outlined"
                                fullWidth
                                onFocus={(e) => e.target.select()}
                                value={formatCurrency(method.value)}
                                onChange={method.onChange}
                                inputRef={method.inputRef}
                                onKeyDown={(e) => handleKeyDown(e, false, onAddEntry)}
                                inputProps={{ inputMode: 'decimal' }}
                                sx={{
                                    ...textBoxStyle,
                                    backgroundColor: !hasValue ? '#f0f0f0' : 'white',
                                }}
                            />

                            {/* 2. Upload button */}
                            <Button
                                variant="contained"
                                color={buttonColor}
                                onClick={() => setUploadMethodKey(method.key)}
                                sx={{
                                    height: '60px',
                                    width: { xs: '100%', sm: 'auto' },
                                    minWidth: { xs: 'unset', sm: '180px' },
                                    px: { xs: 1, sm: 2 },
                                }}
                            >
                                <Typography
                                    variant="button"
                                    sx={{
                                        fontSize: { xs: '0.85rem', sm: '0.875rem' },
                                        lineHeight: 1.2,
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                    }}
                                >
                                    {methodImage ? 'Change' : (isRequired ? 'Upload *' : 'Upload')}
                                </Typography>
                            </Button>

                            {/* 3. Thumbnail */}
                            <Box sx={{
                                width: { xs: '100%', sm: 80 },
                                height: 60,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid #e0e0e0',
                                borderRadius: 1,
                                overflow: 'hidden',
                                bgcolor: '#f5f5f5',
                            }}>
                                {methodImage ? (
                                    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <img
                                            src={methodImage}
                                            alt={`${method.label} preview`}
                                            style={{
                                                width: '100%', height: '100%',
                                                objectFit: 'cover', cursor: 'zoom-in',
                                            }}
                                            onClick={() => {
                                                setPreviewImageSrc(methodImage);
                                                setPreviewOpen(true);
                                            }}
                                        />
                                        <IconButton
                                            size="small"
                                            sx={{
                                                position: 'absolute', top: -5, right: -5,
                                                bgcolor: 'rgba(255,255,255,0.8)', padding: '2px',
                                                '&:hover': { bgcolor: 'rgba(255,100,100,0.9)', color: 'white' },
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onPaymentImageChange(method.key, null);
                                            }}
                                        >
                                            <Close fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="textSecondary">
                                        No Image
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* ── Full-size preview dialog ── */}
            <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
                <DialogContent sx={{
                    p: 0, position: 'relative', bgcolor: 'white',
                    display: 'flex', justifyContent: 'center', minHeight: '200px',
                }}>
                    <IconButton
                        onClick={() => setPreviewOpen(false)}
                        sx={{
                            position: 'absolute', right: 8, top: 8,
                            color: 'white', bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 1,
                        }}
                    >
                        <Check />
                    </IconButton>
                    {previewImageSrc && (
                        <img
                            src={previewImageSrc}
                            alt="Full preview"
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {/* ── Source picker (Camera / Gallery) ── */}
            <Dialog
                open={!!uploadMethodKey}
                onClose={() => setUploadMethodKey(null)}
                maxWidth="xs"
                fullWidth
            >
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

            {/* ── Compression spinner (file picked → cropper not yet open) ──
                Shown while compressToDataUrl() runs asynchronously.
                Prevents the UI from appearing frozen on slow phones. ── */}
            <Dialog open={isCompressing} maxWidth="xs" fullWidth>
                <DialogContent sx={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 2, py: 4,
                }}>
                    <CircularProgress />
                    <Typography variant="body2" color="textSecondary">
                        Preparing image…
                    </Typography>
                </DialogContent>
            </Dialog>

            {/* ── Cropper dialog ──
                cropSrc is only set after pre-compression completes, so
                CropperJS always receives a small data-URL, not raw camera data.
                Unmounting (cropSrc = null) frees all CropperJS internals. ── */}
            <Dialog
                open={!!cropSrc}
                onClose={handleCropCancel}
                maxWidth="sm"
                fullWidth
                disableEscapeKeyDown={isSaving}
            >
                <DialogContent sx={{
                    p: 0, bgcolor: 'black',
                    height: '60vh', display: 'flex', flexDirection: 'column',
                }}>
                    {cropSrc && (
                        <Cropper
                            src={cropSrc}
                            style={{ flexGrow: 1, width: '100%', maxHeight: '60vh' }}
                            initialAspectRatio={NaN}
                            guides
                            ref={cropperRef}
                            viewMode={1}
                            background={false}
                            responsive
                            autoCropArea={1}
                            checkOrientation={false}
                            dragMode="crop"
                        />
                    )}
                </DialogContent>

                <Box sx={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', p: 2, bgcolor: '#f5f5f5',
                }}>
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleCropCancel}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleCropSave}
                        disabled={isSaving}
                        startIcon={isSaving
                            ? <CircularProgress size={16} color="inherit" />
                            : null}
                    >
                        {isSaving ? 'Saving…' : 'Crop & Save'}
                    </Button>
                </Box>
            </Dialog>

        </Box>
    );
};

export default PaymentInputsSection;
