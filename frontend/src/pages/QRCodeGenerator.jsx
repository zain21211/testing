import { useState, useRef, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Card,
    CardContent,
    Grid,
    Container,
    Alert,
    IconButton,
    Tooltip,
    Paper,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import QrCodeIcon from '@mui/icons-material/QrCode';
import { useIndexedDBState } from '../hooks/indexDBHook';
import ProductSelectionGrid from '../components/ProductSelectionGrid';
import { useFilterAutocomplete } from '../hooks/useFilter';
import debounce from 'lodash.debounce';

const QRCodeGenerator = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const userType = user?.userType?.toLowerCase();

    // Product data from IndexedDB
    const [products, , productsLoaded] = useIndexedDBState("products", []);
    const [companies, setCompanies] = useState([]);
    const [categories, setCategories] = useState([]);

    // Product selection state
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [productInputValue, setProductInputValue] = useState('');
    const [productIDInput, setProductIDInput] = useState('');
    const [productID, setProductID] = useState(null);
    const [companyFilter, setCompanyFilter] = useState('');
    const [companyInputValue, setCompanyInputValue] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [categoryInputValue, setCategoryInputValue] = useState('');
    const [Sch, setSch] = useState(false);
    const [isClaim, setIsClaim] = useState(false);

    // QR generation state
    const [quantity, setQuantity] = useState('');
    const [batchNumber, setBatchNumber] = useState('');
    const [generatedQRCodes, setGeneratedQRCodes] = useState([]);
    const [errors, setErrors] = useState({});

    // Refs
    const productIDInputRef = useRef(null);
    const productInputRef = useRef(null);
    const quantityInputRef = useRef(null);
    const qrGridRef = useRef(null);

    // Extract companies and categories from products
    useState(() => {
        if (productsLoaded && products.length > 0) {
            setCompanies(
                [...new Set(products.map((p) => p.Company).filter(Boolean))].sort()
            );
            setCategories(
                [...new Set(products.map((p) => p.Category).filter(Boolean))].sort()
            );
        }
    }, [products, productsLoaded]);

    // Debounced filter setters
    const debouncedSetCompanyFilter = useMemo(
        () => debounce((value) => setCompanyFilter(value), 300),
        []
    );

    const debouncedSetCategoryFilter = useMemo(
        () => debounce((value) => setCategoryFilter(value), 300),
        []
    );

    // Filtered autocomplete options
    const filteredAutocompleteOptions = useFilterAutocomplete(products, {
        companyFilter,
        categoryFilter,
        productInputValue,
        productID,
        initialDataLoading: !productsLoaded,
        setSelectedProduct,
        quantityInputRef,
    });

    const validateInputs = () => {
        const newErrors = {};

        if (!selectedProduct) {
            newErrors.product = 'Please select a product';
        }

        const qty = parseInt(quantity);
        if (!quantity || qty < 1) {
            newErrors.quantity = 'Quantity must be at least 1';
        } else if (qty > 1000) {
            newErrors.quantity = 'Quantity cannot exceed 1000';
        }

        if (!batchNumber || batchNumber.trim() === '') {
            newErrors.batch = 'Batch number is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const generateQRCodes = () => {
        if (!validateInputs()) return;

        const codes = [];
        const qty = parseInt(quantity);

        for (let i = 1; i <= qty; i++) {
            const qrValue = `${selectedProduct.ID}-${batchNumber}-${i}`;
            codes.push({
                id: i,
                value: qrValue,
                productName: selectedProduct.Name,
                productId: selectedProduct.ID,
            });
        }

        setGeneratedQRCodes(codes);
    };

    const downloadQRCode = (qrValue, index) => {
        const svg = document.getElementById(`qr-${index}`);
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        canvas.width = 300;
        canvas.height = 300;

        img.onload = () => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, 300, 300);

            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `QR_${qrValue.replace(/[^a-zA-Z0-9-]/g, '_')}.png`;
                link.click();
                URL.revokeObjectURL(url);
            });
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleReset = () => {
        setSelectedProduct(null);
        setProductInputValue('');
        setProductIDInput('');
        setProductID(null);
        setQuantity('');
        setBatchNumber('');
        setGeneratedQRCodes([]);
        setErrors({});
        setCompanyFilter('');
        setCompanyInputValue('');
        setCategoryFilter('');
        setCategoryInputValue('');
    };

    const setOrderQuantity = (value) => {
        setQuantity(value);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                py: 4,
                '@media print': {
                    background: 'white',
                    py: 0,
                },
            }}
        >
            <Container maxWidth="xl">
                {/* Header */}
                <Box
                    sx={{
                        textAlign: 'center',
                        mb: 4,
                        '@media print': { display: 'none' },
                    }}
                >
                    <QrCodeIcon sx={{ fontSize: 60, color: 'white', mb: 2 }} />
                    <Typography
                        variant="h3"
                        sx={{
                            color: 'white',
                            fontWeight: 'bold',
                            mb: 1,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                        }}
                    >
                        QR Code Generator
                    </Typography>
                    <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                        Generate batch QR codes for your products
                    </Typography>
                </Box>

                {/* Input Form */}
                <Card
                    sx={{
                        mb: 4,
                        borderRadius: 3,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        '@media print': { display: 'none' },
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* Product Selection Grid */}
                        <ProductSelectionGrid
                            userType={userType}
                            productIDInput={productIDInput}
                            setProductIDInput={setProductIDInput}
                            productIDInputRef={productIDInputRef}
                            companies={companies}
                            companyFilter={companyFilter}
                            companyInputValue={companyInputValue}
                            setCompanyInputValue={setCompanyInputValue}
                            debouncedSetCompanyFilter={debouncedSetCompanyFilter}
                            categories={categories}
                            categoryFilter={categoryFilter}
                            categoryInputValue={categoryInputValue}
                            setCategoryInputValue={setCategoryInputValue}
                            debouncedSetCategoryFilter={debouncedSetCategoryFilter}
                            Sch={Sch}
                            setSch={setSch}
                            isClaim={isClaim}
                            setIsClaim={setIsClaim}
                            productInputValue={productInputValue}
                            setProductInputValue={setProductInputValue}
                            filteredAutocompleteOptions={filteredAutocompleteOptions}
                            selectedProduct={selectedProduct}
                            setSelectedProduct={setSelectedProduct}
                            setProductID={setProductID}
                            setOrderQuantity={setOrderQuantity}
                            productInputRef={productInputRef}
                            quantityInputRef={quantityInputRef}
                            biggerCheckboxLabelSize="1rem"
                            biggerInputTextSize="1rem"
                            biggerShrunkLabelSize="1rem"
                            initialDataLoading={!productsLoaded}
                            bigger={{}}
                        />

                        {errors.product && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                {errors.product}
                            </Alert>
                        )}

                        <Grid container spacing={3} sx={{ mt: 2 }}>
                            {/* Quantity Input */}
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Quantity"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => {
                                        setQuantity(e.target.value);
                                        setErrors({ ...errors, quantity: null });
                                    }}
                                    error={!!errors.quantity}
                                    helperText={errors.quantity}
                                    fullWidth
                                    inputProps={{ min: 1, max: 1000 }}
                                    placeholder="1-1000"
                                    inputRef={quantityInputRef}
                                />
                            </Grid>

                            {/* Batch Number Input */}
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Batch Number"
                                    value={batchNumber}
                                    onChange={(e) => {
                                        setBatchNumber(e.target.value);
                                        setErrors({ ...errors, batch: null });
                                    }}
                                    error={!!errors.batch}
                                    helperText={errors.batch}
                                    fullWidth
                                    placeholder="e.g., B001"
                                />
                            </Grid>

                            {/* Action Buttons */}
                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        onClick={generateQRCodes}
                                        startIcon={<QrCodeIcon />}
                                        sx={{
                                            background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                                            px: 4,
                                            py: 1.5,
                                            fontSize: '1.1rem',
                                            fontWeight: 'bold',
                                            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
                                            '&:hover': {
                                                background: 'linear-gradient(45deg, #764ba2 30%, #667eea 90%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 6px 25px rgba(102, 126, 234, 0.5)',
                                            },
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        Generate QR Codes
                                    </Button>

                                    {generatedQRCodes.length > 0 && (
                                        <>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                onClick={handlePrint}
                                                startIcon={<PrintIcon />}
                                                sx={{
                                                    borderColor: '#667eea',
                                                    color: '#667eea',
                                                    '&:hover': {
                                                        borderColor: '#764ba2',
                                                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                                                    },
                                                }}
                                            >
                                                Print All
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="large"
                                                onClick={handleReset}
                                                sx={{
                                                    borderColor: '#999',
                                                    color: '#666',
                                                    '&:hover': {
                                                        borderColor: '#666',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                                    },
                                                }}
                                            >
                                                Reset
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Info Alert */}
                        {selectedProduct && quantity && batchNumber && (
                            <Alert severity="info" sx={{ mt: 3 }}>
                                <Typography variant="body2">
                                    <strong>Preview:</strong> QR codes will be generated with format:{' '}
                                    <code>
                                        {selectedProduct.ID}-{batchNumber}-[1 to {quantity}]
                                    </code>
                                </Typography>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* QR Code Grid */}
                {generatedQRCodes.length > 0 && (
                    <Box ref={qrGridRef}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                                '@media print': {
                                    boxShadow: 'none',
                                    p: 2,
                                },
                            }}
                        >
                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 3,
                                    fontWeight: 'bold',
                                    color: '#667eea',
                                    '@media print': { fontSize: '1.2rem', mb: 2 },
                                }}
                            >
                                Generated QR Codes ({generatedQRCodes.length})
                            </Typography>

                            <Grid container spacing={3}>
                                {generatedQRCodes.map((qr, index) => (
                                    <Grid item xs={6} sm={4} md={3} lg={2} key={qr.id}>
                                        <Card
                                            sx={{
                                                textAlign: 'center',
                                                p: 2,
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-5px)',
                                                    boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
                                                },
                                                '@media print': {
                                                    boxShadow: 'none',
                                                    border: '1px solid #ddd',
                                                    p: 1,
                                                    '&:hover': {
                                                        transform: 'none',
                                                    },
                                                },
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    mb: 1,
                                                }}
                                            >
                                                <QRCodeSVG
                                                    id={`qr-${index}`}
                                                    value={qr.value}
                                                    size={150}
                                                    level="H"
                                                    includeMargin={true}
                                                />
                                            </Box>

                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'block',
                                                    fontWeight: 'bold',
                                                    color: '#333',
                                                    wordBreak: 'break-all',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                {qr.value}
                                            </Typography>

                                            <Tooltip title="Download QR Code">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => downloadQRCode(qr.value, index)}
                                                    sx={{
                                                        mt: 1,
                                                        color: '#667eea',
                                                        '@media print': { display: 'none' },
                                                    }}
                                                >
                                                    <DownloadIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    </Box>
                )}

                {/* Empty State */}
                {generatedQRCodes.length === 0 && (
                    <Paper
                        sx={{
                            p: 6,
                            textAlign: 'center',
                            borderRadius: 3,
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            '@media print': { display: 'none' },
                        }}
                    >
                        <QrCodeIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                            No QR codes generated yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Select a product, enter quantity and batch number, then click "Generate QR Codes"
                        </Typography>
                    </Paper>
                )}
            </Container>

            {/* Print Styles */}
            <style>
                {`
                    @media print {
                        @page {
                            size: A4;
                            margin: 1cm;
                        }
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                        }
                    }
                `}
            </style>
        </Box>
    );
};

export default QRCodeGenerator;
