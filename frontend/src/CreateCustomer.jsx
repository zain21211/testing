import React, { useEffect, useState } from 'react';
import { TextField, Button, Card, CardContent, Typography, Box, Autocomplete, List, ListItem } from '@mui/material';
import axios from 'axios';
// import { options } from '../../backend/database/config';
// import { CoolMode } from "@/registry/magicui/cool-mode";

const fields = ["Name", "Urdu name", 'Address', "Route", 'Phone Number', 'Whatsapp', "Credit Days", "Credit Limit"]
const discountOptions = ['d1', 'd2']; // example options


const cleanString = string => {
    const cleaned = string.toLowerCase().replace(/\s/g, '');
    return cleaned;
}

const CreateCustomer = ({ onCustomerCreated }) => {
    const [formData, setFormData] = useState({}); // Add email to formData
    const [errors, setErrors] = useState({});
    const [companyOptions, setCompanyOptions] = useState([])
    const [listOptions, setListOptions] = useState([])
    const [discount, setDiscount] = useState(null)
    const [discountList, setDiscountList] = useState([])

    useEffect(()=>{

    setCompanyOptions(["fit", "excel", 'strong'])
    setListOptions(['A', 'B'])
    }, [])

    const discountFields = [
        {
            label: 'comapny',
            options: companyOptions
        },
        {
            label: "list",
            options: listOptions
        },
    ]
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
        setDiscountList(perv => [...perv, discount])
        setDiscount(null)
    }



    // setErrors({ ...errors, [name]: '' });
    // };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.address.trim()) newErrors.address = 'Address is required';
        if (!formData.route.trim()) newErrors.route = 'Route is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required'; // Add email validation
        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // const formErrors = validateForm();
        // if (Object.keys(formErrors).length > 0) {
        //     setErrors(formErrors);
        //     return;
        // }

        try {
            console.log(formData);
            await axios.post('http://localhost:3001/api/customers', formData, {
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            onCustomerCreated();
            setFormData({}); // Reset email in formData
        } catch (error) {
            console.error('Error creating customer:', error);
            alert('Failed to create account.');
            // ... (Error logging as before) ...
        }
    };

    useEffect(() => {
        console.log(discount)
    }, [discount])

    return (
        <Card sx={{ boxShadow: 3, borderRadius: 2, p: 0 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>Create New Customer Account</Typography>
                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
                    {fields.map(field => (
                        <TextField
                            label={field}
                            name={cleanString(field)}
                            value={formData[cleanString(field)]}
                            onChange={handleChange}
                            error={!!errors[cleanString(field)]}
                            helperText={errors[cleanString(field)]}
                            fullWidth required
                            sx={{
                                '& input': {
                                    fontSize: '1.3rem'
                                }
                            }}
                        />

                    ))}

                </Box>
                <Typography variant='h3' marginY={3} fontWeight={"bold"}> DISCOUNT </Typography>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: 'repeat(4, 1fr)', gap: 2,
                    }}
                >
                    {discountFields.map((field, index) => (
                        <Autocomplete
                            freeSolo
                            options={field.options}
                            value={discount?.[cleanString(field.label)] || ''}
                            onChange={(event, newValue) => {
                                handleDiscount({ target: { name: cleanString(field.label), value: newValue } });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label={field.label}
                                    name={cleanString(field.label)}
                                    error={!!errors.discount}
                                    helperText={errors.discount}
                                    fullWidth
                                    required
                                    sx={{ '& input': { fontSize: '1.3rem' } }}
                                />
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
                            error={!!errors[cleanString(field)]}
                            helperText={errors[cleanString(field)]}
                            fullWidth
                            required
                            sx={{ '& input': { fontSize: '1.3rem' } }}
                        />
                    ))}

                </Box>
                <Button sx={{ marginTop: 5, fontWeight: 'bold', fontSize: '1.5rem' }} onClick={handleAdd} variant="contained" color="primary" fullWidth>ADD</Button>

                {discountList?.map((item, index) => (
                    <List key={index}>
                        <ListItem key={index}>
                        {Object.keys(item).map((key) => (
                                <Typography marginRight={1}>{key}: {String(item[key])} </Typography>
                            ))}
                            </ListItem>
                    </List>
                ))}

                <Button type="submit" sx={{ marginTop: 5, fontWeight: 'bold', fontSize: '1.5rem' }} variant="contained" color="primary" fullWidth>Create Account</Button>
            </CardContent>
        </Card>
    );
};

export default CreateCustomer;