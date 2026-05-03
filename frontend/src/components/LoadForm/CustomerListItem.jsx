import React, { useState, useRef } from 'react';
import { ListItem, ListItemText, Button, CircularProgress, TextField, Box, Typography } from '@mui/material';
import { CloudUpload, PhotoCamera, Send } from '@mui/icons-material';
import axios from 'axios';

const url = import.meta.env.VITE_API_URL;

const CustomerListItem = ({ customer, nug, setNug, user, fetchList }) => {
    const [selectedImage, setSelectedImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);

    const doc = customer.doc;
    const isOperator = user?.userType?.toLowerCase().includes('operator');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!selectedImage) return;
        setIsSubmitting(true);
        try {
            // 1. Update the invoice status and vehicle in psdetail
            await axios.put(`${url}/invoices/operator/delivery`, {
                doc: customer.doc,
                username: user.username,
                status: 'delivered'
            });

            // 2. Upload the image
            await axios.post(`${url}/customers/createDeliveryImages`, {
                img: selectedImage,
                id: customer.ACID || customer.acid,
                doc: customer.doc,
                type: 'sale',
                status: 'tally', // default to tally for this direct flow
                date: new Date().toISOString(),
            });

            // 3. Clear state and refresh list
            setSelectedImage(null);
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
            <ListItemText
                sx={{ width: "50%", textAlign: 'right' }}
                primary={customer.UrduName}
                secondary={`${customer.doc} - ${customer.route} `}
                primaryTypographyProps={{
                    sx: {
                        fontWeight: "bold",
                        fontSize: "2.2rem",
                        fontFamily: "Jameel Noori Nastaleeq, serif",
                        letterSpacing: "normal",
                    },
                }}
                secondaryTypographyProps={{
                    sx: {
                        fontStyle: "italic",
                        color: "text.secondary",
                        fontWeight: "bold",
                        fontSize: "1.1rem",
                    },
                }}
            />

            <Box
                sx={{
                    width: "50%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start'
                }}
            >
                {isOperator ? (
                    <>
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

                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<CloudUpload />}
                                onClick={() => fileInputRef.current.click()}
                                sx={{ minWidth: 90 }}
                            >
                                Upload
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<PhotoCamera />}
                                onClick={() => cameraInputRef.current.click()}
                                sx={{ minWidth: 90 }}
                            >
                                Camera
                            </Button>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                disabled={!selectedImage || isSubmitting}
                                startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Send />}
                                onClick={handleSubmit}
                                sx={{ minWidth: 90 }}
                            >
                                {isSubmitting ? "..." : "Submit"}
                            </Button>
                        </Box>
                        {selectedImage && (
                            <Box sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', border: '1px solid #ccc' }}>
                                <img src={selectedImage} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                        )}
                    </>
                ) : (
                    <>
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
                    </>
                )}
            </Box>
        </ListItem>
    );
};

export default CustomerListItem;