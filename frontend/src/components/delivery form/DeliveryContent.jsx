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
import SignaturePad from "./SignaturePad";
import { formatCurrency } from "../../utils/formatCurrency";
import RadioButtons from "./RadioButtons";
const biggerInputTextSize = '1.4rem'; // For text inside input fields
const biggerShrunkLabelSize = '0.9rem';  // For labels when they shrink (float above)
const biggerCheckboxLabelSize = '1rem'; // For checkbox labels

const bigger = {
    "& .MuiInputBase-input.Mui-disabled": {
        textAlign: "right",
        fontWeight: "bold",
        fontFamily: "'Poppins', sans-serif",
        WebkitTextFillColor: "black !important",
        fontSize: biggerInputTextSize,
        "&::-webkit-outer-spin-button": {
            WebkitAppearance: "none",
            margin: 0,
        },
        "&::-webkit-inner-spin-button": {
            WebkitAppearance: "none",
            margin: 0,
        },
        "&[type=number]": {
            MozAppearance: "textfield", // Firefox
        },
    },
    "& .MuiInputLabel-root.Mui-disabled": {
        fontSize: biggerShrunkLabelSize,
        fontFamily: "'Poppins', sans-serif",
        color: "rgba(0, 0, 0, 0.6)" // Default disabled label color
    },
    "& .MuiInputBase-input": {
        textAlign: "right",
        fontSize: biggerInputTextSize,
        fontWeight: 'bold',
        fontFamily: "'Poppins', sans-serif",
        // fontFamily: "'Roboto Mono', monospace",
        "&::-webkit-outer-spin-button": {
            WebkitAppearance: "none",
            margin: 0,
        },
        "&::-webkit-inner-spin-button": {
            WebkitAppearance: "none",
            margin: 0,
        },
        "&[type=number]": {
            MozAppearance: "textfield", // Firefox
        },
    },
    '& .MuiInputLabel-root.MuiInputLabel-shrink': {
        fontSize: biggerShrunkLabelSize
    },

}

const DeliveryContent = ({ id, name,
    shopper, error, captureRef, dialogFields, extra,
    secondaryFields, handleChange, handleRadioChange
}) => {
    console.log(secondaryFields)
    return (
        <>
            <Box
                ref={captureRef}
            >
                <Typography fontSize={'3rem'} fontWeight={'BOLD'} sx={{
                    fontFamily: "Jameel Noori Nastaleeq, serif",
                    letterSpacing: 'normal',
                    // backgroundColor: 'pink',
                    textAlign: 'center',

                }}>
                    {name}
                </Typography>
                <Box
                    sx={{
                        px: 1,
                        py: 1,
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                    <Box
                        sx={{
                            width: '47%',
                            display: 'grid', gap: 1,
                            gridTemplateColumns: 'repeat(1, 1fr)'
                        }}>
                        {dialogFields.map(field => (
                            <TextField
                                label={field.name}
                                fullWidth
                                disabled={field.disabled}
                                sx={{ ...bigger, textAlign: field.align, }}
                                InputProps={{
                                    sx: {
                                        textAlign: field.align,
                                        color: field.color,
                                        backgroundColor: field.backgroundColor,
                                    },
                                }}
                                value={
                                    field.val?.[id] !== undefined
                                        ? formatCurrency(field.val[id])
                                        : field.val !== undefined && field.val !== null
                                            ? formatCurrency(Number(field.val))
                                            : ""
                                }
                                onFocus={e => e.target.select()}
                                onChange={(e) => handleChange(id, e.target.value)}
                            />

                        ))}
                    </Box>
                    <Box
                        sx={{
                            width: { xs: '55%', sm: '55%', md: 'auto' },
                        }}>

                        {/* for radio buttons */}
                        <Box sx={{
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <RadioButtons
                                selected={secondaryFields.map(field => field.name)}
                                handleChange={handleRadioChange}
                            />
                        </Box>

                        {secondaryFields.length > 0 && (secondaryFields.map(field => (
                            <>
                                <TextField
                                    label={field.name}
                                    fullWidth
                                    disabled={field.disabled}
                                    sx={{ ...bigger, textAlign: field.align, mb: 1, }}
                                    InputProps={{
                                        sx: {
                                            textAlign: field.align,
                                            color: field.color,
                                            backgroundColor: field.backgroundColor,
                                        },
                                    }}
                                    value={
                                        formatCurrency(extra[field.name])
                                    }
                                    onFocus={e => e.target.select()}
                                    onChange={(e) => field.handleChange(id, e.target.value)}
                                />
                            </>
                        )))}
                        <Typography fontSize={'2rem'} fontWeight={'BOLD'} backgroundColor={'pink'} textAlign={'right'} margin={'auto'}
                            sx={{
                                dir: 'rtl',
                                px: 1,
                            }}>
                            <u>{shopper || 0}</u> :<span style={{
                                fontFamily: "Jameel Noori Nastaleeq, serif",
                                letterSpacing: 'normal',
                                fontSize: '2.5rem',
                            }}> نگ موصول ہوا</span>
                        </Typography>


                    </Box>
                </Box>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignContent: 'center',
                        width: '100%'
                    }}>
                    <SignaturePad />

                </Box>
            </Box>
            {error && <Typography color="error">{error}</Typography>}
        </>
    )
}

export default DeliveryContent;