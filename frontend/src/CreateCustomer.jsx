import React, { useEffect, useState } from 'react';
import {
    TextField, Button, Card, CardContent, Typography, Box, Autocomplete, List,
    ListItem,
    ListItemText,
    Divider,
} from '@mui/material';
import axios from 'axios';

const fields = ["Name", "Urdu name", 'Address', "Route", 'Phone Number', 'Whatsapp', "Credit Days", "Credit Limit"];
const discountOptions = ['d1', 'd2']; // example options

const cleanString = string => {
    const cleaned = string?.toLowerCase().replace(/\s/g, '');
    return cleaned;
};

const CreateCustomer = ({ onCustomerCreated }) => {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([]);
    const [listOptions, setListOptions] = useState([]);
    const [discount, setDiscount] = useState(null);
    const [discountList, setDiscountList] = useState([]);

    useEffect(() => {
        setCompanyOptions(["fit", "excel", 'strong']);
        setListOptions(['A', 'B']);
    }, []);

    const discountFields = [
        {
            label: 'Company',
            options: companyOptions
        },
        {
            label: "List",
            options: listOptions
        },
    ];

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setErrors({ ...errors, [name]: '' });
    };

    const handleDiscount = (e) => {
        const { name, value } = e.target;
        setDiscount({ ...discount, [name]: value });
    };

    const handleAdd = () => {
        if (discount && Object.values(discount).some(v => v)) { // only add if discount has some value
            setDiscountList(prev => [...prev, discount]);
            setDiscount(null); // Reset for the next entry
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const finalFormData = { ...formData, discounts: discountList };
            console.log(finalFormData);
            await axios.post('http://localhost:3001/api/customers', finalFormData, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            onCustomerCreated();
            setFormData({});
            setDiscountList([]);
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Failed to create account.');
        }
    };

    return (
        <Card sx={{ boxShadow: 2, borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
                <Typography variant="h6" component="h1" gutterBottom>
                    Create New Customer
                </Typography>
                <Box component="form" onSubmit={handleSubmit}>
                    {/* Customer Fields */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: 1.5
                    }}>
                        {fields.map(field => (
                            <TextField
                                key={field}
                                label={field}
                                name={cleanString(field)}
                                value={formData[cleanString(field)] || ''}
                                onChange={handleChange}
                                error={!!errors[cleanString(field)]}
                                helperText={errors[cleanString(field)]}
                                fullWidth
                                required
                                size="small"
                            />
                        ))}
                    </Box>

                    {/* Discount Section Divider */}
                    <Divider sx={{ my: 2 }}>
                        <Typography variant="body1">Discounts</Typography>
                    </Divider>

                    {/* Discount Input Fields */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: 1.5,
                        alignItems: 'center',
                        mb: 1.5,
                    }}>
                        {discountFields.map((field, index) => (
                            <Autocomplete
                                key={index}
                                freeSolo
                                options={field.options}
                                value={discount?.[cleanString(field.label)] || ''}
                                onChange={(event, newValue) => {
                                    handleDiscount({ target: { name: cleanString(field.label), value: newValue } });
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label={field.label} fullWidth size="small" />
                                )}
                            />
                        ))}
                        {discountOptions.map((field) => (
                            <TextField
                                key={field}
                                label={field}
                                name={cleanString(field)}
                                value={discount?.[cleanString(field)] || ''}
                                onChange={handleDiscount}
                                fullWidth
                                size="small"
                            />
                        ))}
                        <Button onClick={handleAdd} variant="contained" color="primary" sx={{ height: '40px' }}>
                            Add
                        </Button>
                    </Box>

                    {/* Applied Discounts List */}
                    {discountList?.length > 0 && (
                        <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                            <List dense sx={{ py: 0 }}>
                                {discountList.map((item, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem sx={{ py: 0.5 }}>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem 1rem' }}>
                                                        {Object.entries(item).map(([key, value]) => (
                                                            <Typography component="span" variant="body2" key={key}>
                                                                <Typography variant="body2" component="span" sx={{ fontWeight: '500' }}>
                                                                    {key}:
                                                                </Typography>
                                                                {` ${String(value)}`}
                                                            </Typography>
                                                        ))}
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < discountList.length - 1 && <Divider component="li" />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </Box>
                    )}

                    {/* Submit Button */}
                    <Button type="submit" sx={{ mt: 2, fontWeight: 'bold' }} variant="contained" color="primary" fullWidth>
                        Create Account
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CreateCustomer;