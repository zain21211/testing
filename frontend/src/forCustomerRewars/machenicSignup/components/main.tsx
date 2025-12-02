import React, { useState } from 'react';
import { Box, Button, TextField, Typography, Alert, CircularProgress, Paper } from '@mui/material';
import Signup from './Signup';
import useMachenicSignup from '../hooks/useMachenicSignup';

interface MechanicSignupData {
    name: string;
    email: string;
    phone: string;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    images: {
        shop: string[];
        machenic: string;
    };
}

const MechanicSignupMain: React.FC = () => {
    const { signup, loading, error, success } = useMachenicSignup();

    const [formData, setFormData] = useState<MechanicSignupData>({
        name: '',
        email: '',
        phone: '',
        location: {
            lat: 0,
            lng: 0,
            address: '',
        },
        images: {
            shop: [],
            machenic: '',
        },
    });

    const [previewMode, setPreviewMode] = useState(false);

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => {
            const keys = field.split('.');
            if (keys.length === 1) {
                return { ...prev, [field]: value };
            } else if (keys.length === 2) {
                return {
                    ...prev,
                    [keys[0]]: {
                        ...(prev[keys[0] as keyof MechanicSignupData] as any),
                        [keys[1]]: value,
                    },
                };
            } else if (keys.length === 3) {
                return {
                    ...prev,
                    [keys[0]]: {
                        ...(prev[keys[0] as keyof MechanicSignupData] as any),
                        [keys[1]]: {
                            ...((prev[keys[0] as keyof MechanicSignupData] as any)[keys[1]]),
                            [keys[2]]: value,
                        },
                    },
                };
            }
            return prev;
        });
    };

    const handleShopImagesChange = (value: string) => {
        const imagesArray = value.split(',').map(img => img.trim()).filter(img => img);
        handleInputChange('images.shop', imagesArray);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const result = await signup(formData);
        if (result) {
            console.log('Signup successful:', result);
            // Optionally reset form or redirect user
        }
    };

    const togglePreview = () => {
        setPreviewMode(!previewMode);
    };

    if (previewMode) {
        return (
            <Box sx={{ p: 3 }}>
                <Button variant="outlined" onClick={togglePreview} sx={{ mb: 2 }}>
                    Back to Form
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: 800, m: 'auto', backgroundColor: 'pink', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}>
            <Signup handleSubmit={handleSubmit} data={formData} />
        </Box>
    );
};

export default MechanicSignupMain;
