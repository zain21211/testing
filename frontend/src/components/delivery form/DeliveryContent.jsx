import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from "@mui/material";
import SignatureCanvas from "react-signature-canvas";
import { formatCurrency } from "../../utils/formatCurrency";

const DeliveryContent = ({ name, shopper, error, captureRef, dialogFields, secondaryFields, handleChange }) => {

    return (
        <>
            <Box
                ref={captureRef}
            >

                <Box
                    sx={{
                        p: 5,
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                    <Box
                        sx={{
                            display: 'grid', gap: 1,
                            gridTemplateColumns: 'repeat(1, 1fr)'
                        }}>
                        {dialogFields.map(field => (
                            <TextField
                                label={field.name}
                                fullWidth
                                disabled={field.disabled}
                                InputProps={{
                                    sx: {
                                        textAlign: field.align,          // ✅ applies to input text
                                        color: field.color,
                                        backgroundColor: field.backgroundColor,
                                    }
                                }}
                                value={formatCurrency(field.val)}
                                onChange={(e) => handleChange(e.target.value)}
                            // margin="normal"
                            />
                        ))}
                    </Box>
                    <Box>
                        <Typography fontSize={'2rem'} fontWeight={'BOLD'}>
                            {name}
                        </Typography>
                        {secondaryFields.map(field => (
                            <Typography fontSize={'2rem'} fontWeight={'BOLD'}>
                                {field.name} : {shopper}
                            </Typography>
                        ))}

                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignContent: 'center',
                        width: '100%'
                    }}>
                    <SignatureCanvas
                        penColor="black"
                        canvasProps={{
                            width: 450,
                            height: 400,
                            className: "sigCanvas", // for CSS styling
                            style: { backgroundColor: "lightgrey", border: "1px solid #ccc" }, // inline
                        }}
                    />
                </Box>
            </Box>
            {error && <Typography color="error">{error}</Typography>}
        </>
    )
}

export default DeliveryContent;