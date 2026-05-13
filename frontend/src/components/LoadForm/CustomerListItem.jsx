import React, { useState, useRef } from 'react';
import { ListItem, ListItemText, Button, CircularProgress, TextField, Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { CloudUpload, PhotoCamera, Send, Close } from '@mui/icons-material';
import axios from 'axios';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

const url = import.meta.env.VITE_API_URL;

const compressImage = (file, maxWidth, maxHeight, quality) => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    URL.revokeObjectURL(objectUrl);
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject(new Error("Canvas compression failed"));
                    }
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });
};

const CustomerListItem = ({ customer, nug, setNug, user, fetchList, onSuccess }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [tempImage, setTempImage] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const cropperRef = useRef(null);

    const doc = customer.doc;
    const isOperatorOrAdmin = user?.userType?.toLowerCase().includes('operator') || 
                              user?.userType?.toLowerCase().includes('admin') || 
                              user?.userType?.toLowerCase().includes('pack') || 
                              user?.username?.toLowerCase().includes('zain');

    const handleFileChange = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;

            // Show a loading state if possible (we don't have one, but compression is fast)
            const compressedUrl = await compressImage(file, 1280, 1280, 0.7);
            
            setTempImage(compressedUrl);
            setCropModalOpen(true);
        } catch (error) {
            console.error("Image loading/compression error:", error);
            alert("Could not process the image. Please try another one.");
        } finally {
            if (e.target) {
                e.target.value = null;
            }
        }
    };

    const handleCropSave = () => {
        if (cropperRef.current && cropperRef.current.cropper) {
            const canvas = cropperRef.current.cropper.getCroppedCanvas({
                maxWidth: 1024,
                maxHeight: 1024,
            });
            if (canvas) {
                const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                setSelectedImage(dataUrl);
                setCropModalOpen(false);
                URL.revokeObjectURL(tempImage);
                setTempImage(null);
            }
        }
    };

    const handleCropCancel = () => {
        setCropModalOpen(false);
        if (tempImage) {
            URL.revokeObjectURL(tempImage);
            setTempImage(null);
        }
    };

    const handleSubmit = async () => {
        if (!selectedImage) return;
        setIsSubmitting(true);
        try {
            const timestamp = new Date().toISOString();

            // 1. Update the invoice status and vehicle in psdetail
            await axios.put(`${url}/invoices/operator/delivery`, {
                doc: customer.doc,
                username: user.username,
                status: 'delivered',
                timestamp // Auditing
            });

            // 2. Upload the image
            await axios.post(`${url}/customers/createDeliveryImages`, {
                img: selectedImage,
                id: customer.ACID || customer.acid,
                doc: customer.doc,
                type: 'sale',
                status: 'tally', // default to tally for this direct flow
                date: timestamp, // Auditing
                username: user.username, // Auditing
            });

            // 3. Clear state and refresh list
            setSelectedImage(null);
            if (onSuccess) onSuccess(customer.doc);
            if (fetchList) fetchList();
        } catch (error) {
            console.error("Operator submission failed:", error);
            alert("Submission failed. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ListItem sx={{ display: "flex", flexDirection: 'row-reverse', justifyContent: "space-between", borderBottom: 1, py: 2 }}>
            <Box sx={{ width: "50%", textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <Typography>
                    <span style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', backgroundColor: '#1976d2', padding: '1px 8px', borderRadius: '6px' }}>
                        {customer.doc}
                    </span>
                </Typography>
                <Typography sx={{ fontWeight: "bold", fontSize: "2.2rem", fontFamily: "Jameel Noori Nastaleeq, serif", letterSpacing: "normal" }}>
                    {customer.UrduName}
                </Typography>
                <Typography sx={{ fontStyle: "italic", color: "text.secondary", fontWeight: "bold", fontSize: "1.1rem" }}>
                    {customer.RouteNumber || customer.route}
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', color: '#888' }}>
                    {customer.Date ? (() => {
                        const d = new Date(customer.Date);
                        const day = String(d.getDate()).padStart(2, '0');
                        const mon = d.toLocaleString('en', { month: 'short' });
                        const yr = String(d.getFullYear()).slice(-2);
                        return `${day}-${mon}-${yr}`;
                    })() : ''}
                    {customer.goods ? ` | ${customer.goods}` : ''}
                </Typography>
            </Box>

            <Box
                sx={{
                    width: "50%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 1,
                }}
            >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center", width: "100%", justifyContent: "flex-end" }}>
                    <TextField
                        label="NUG"
                        value={nug?.[doc] ?? ""}
                        inputProps={{
                            inputMode: "numeric",
                            pattern: "[0-9]*",
                        }}
                        onChange={e =>
                            setNug(prev => ({
                                ...prev,
                                [doc]: e.target.value,
                            }))
                        }
                        sx={{
                            flex: 1,
                            textAlign: "center",
                            "& .MuiInputBase-input": {
                                fontSize: "1.5rem",
                                fontWeight: "bold",
                                textAlign: "center",
                            },
                        }}
                    />
                    <Typography variant="h6" sx={{ backgroundColor: 'grey', p: 1, color: 'white', borderRadius: 2, minWidth: 50, textAlign: 'center' }}>
                        <span style={{ fontSize: "2rem", fontWeight: 600 }}>
                            {customer.shopper || 0}
                        </span>
                    </Typography>
                </Box>

                {isOperatorOrAdmin && (
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, width: "100%", mt: 0.5 }}>
                        <input
                            type="file"
                            hidden
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <input
                            type="file"
                            hidden
                            ref={cameraInputRef}
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                        />

                        {/* Row 1 */}
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<CloudUpload />}
                            onClick={() => fileInputRef.current.click()}
                            sx={{ width: '100%', fontSize: '0.75rem', px: 1, py: 0.5, height: 36 }}
                        >
                            Upload
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<PhotoCamera />}
                            onClick={() => cameraInputRef.current.click()}
                            sx={{ width: '100%', fontSize: '0.75rem', px: 1, py: 0.5, height: 36 }}
                        >
                            Camera
                        </Button>

                        {/* Row 2 */}
                        <Box sx={{ width: '100%', height: 80 }}>
                            {selectedImage && (
                                <Box sx={{ position: 'relative', width: '100%', height: '100%', borderRadius: 1, border: '1px solid #ccc' }}>
                                    <img src={selectedImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '4px' }} />
                                    <IconButton
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: -8,
                                            right: -8,
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            '&:hover': { bgcolor: 'error.dark' },
                                            p: 0.3,
                                            zIndex: 10
                                        }}
                                        onClick={() => setSelectedImage(null)}
                                    >
                                        <Close sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </Box>
                            )}
                        </Box>

                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            disabled={!selectedImage || isSubmitting}
                            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                            onClick={handleSubmit}
                            sx={{ width: '100%', height: 80, fontSize: '0.75rem', px: 1, py: 0.5 }}
                        >
                            {isSubmitting ? "..." : "Submit"}
                        </Button>
                    </Box>
                )}
            </Box>

            <Dialog open={cropModalOpen} onClose={handleCropCancel} maxWidth="sm" fullWidth>
                <DialogTitle>Crop Image</DialogTitle>
                <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
                    {tempImage && (
                        <Cropper
                            src={tempImage}
                            style={{ height: 400, width: "100%" }}
                            initialAspectRatio={1}
                            guides={true}
                            ref={cropperRef}
                            viewMode={1}
                            autoCropArea={1}
                        />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCropCancel} color="error">Cancel</Button>
                    <Button onClick={handleCropSave} variant="contained" color="primary">Crop & Save</Button>
                </DialogActions>
            </Dialog>
        </ListItem>
    );
};

export default CustomerListItem;