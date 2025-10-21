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
import { useEffect, useState } from "react";
import MyCheckbox from "../Checkbox";
import { formatedTime } from "../../utils/FormatedTime";
const biggerInputTextSize = "1.4rem"; // For text inside input fields
const biggerShrunkLabelSize = "0.9rem"; // For labels when they shrink (float above)
const biggerCheckboxLabelSize = "1rem"; // For checkbox labels

const onChecked = ' پارٹی بیلنس ٹیلی';
const onUnchecked = 'پارٹی بیلنس فرق';

const bigger = {
    "& .MuiInputBase-input.Mui-disabled": {
        textAlign: "left",
        fontWeight: "bold",
        fontFamily: "'Poppins', sans-serif",
        // p: 1,
        // WebkitTextFillColor: "white !important",
        fontSize: biggerInputTextSize,
        // color: 'white',
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
        color: "rgba(0, 0, 0, 0.6)", // Default disabled label color
    },
    "& .MuiInputBase-input": {
        textAlign: "left",
        fontSize: biggerInputTextSize,
        fontWeight: "bold",
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
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
        fontSize: biggerShrunkLabelSize,
    },
};

const DeliveryContent = ({
    id,
    setIsTally,
    name,
    onReset,
    doc,
    shopper,
    error,
    captureRef,
    dialogFields,
    extra,
    secondaryFields,
    handleChange,
    handleRadioChange,
    getImage,
    images,
}) => {
    const [isImg, setIsImg] = useState(false);
    const [open, setOpen] = useState(false);
    const [flag, setFlag] = useState(true);        // flag for marking tally

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    useEffect(() => {
        setIsTally(flag)
    }, [flag]);

    return (
        <>
            <Box ref={captureRef}>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Typography
                        fontSize={"2rem"}
                        fontWeight={"BOLD"}
                        sx={{
                            fontFamily: "poppins, serif",
                            letterSpacing: "normal",
                            // backgroundColor: 'pink',
                            textAlign: "center",
                            // width: '75%',
                        }}
                    >
                        {doc}
                    </Typography>
                    <Typography
                        fontSize={"3rem"}
                        fontWeight={"BOLD"}
                        sx={{
                            fontFamily: "Jameel Noori Nastaleeq, serif",
                            letterSpacing: "normal",
                            textAlign: "center",
                        }}
                    >
                        {name}
                    </Typography>

                    <Button
                        variant="outlined"
                        sx={{
                            // backgroundColor: images?.agreement ? 'green' : 'red',
                            fontSize: "1.2rem",
                            fontWeight: "bold",
                        }}
                        disabled={images?.agreement ? false : true}
                        onClick={handleOpen}
                    >
                        Img {images?.agreement ? "✔️" : "❌"}
                    </Button>
                </Box>
                <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
                    <DialogContent
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            p: 2,
                        }}
                    >
                        {images?.agreement ? (
                            <Box
                                component="img"
                                src={images.agreement}
                                alt="Agreement"
                                sx={{
                                    maxWidth: "100%",
                                    maxHeight: "80vh",
                                    objectFit: "contain",
                                    borderRadius: 2,
                                }}
                            />
                        ) : (
                            <Box>No image found.</Box>
                        )}
                    </DialogContent>
                </Dialog>

                {/* time and checkbox */}
                <Box sx={{
                    display: 'grid',
                    justifyContent: 'space-between',
                    alignContent: 'center',
                    justifyItems: 'center',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    marginY: 1,
                    gap: 2
                }}>
                    {/* time */}
                    <Typography fontFamily={'poppins, serif'} sx={{ backgroundColor: 'lightgrey', padding: 1, borderRadius: 2, fontWeight: 'bold' }}>
                        {formatedTime(new Date())}
                    </Typography>
                    <Button variant="contained" onClick={onReset} sx={{ backgroundColor: 'red', fontSize: '1.3rem', fontWeight: 'bold' }}>return</Button>
                    {/* checkbox */}
                    <MyCheckbox flag={flag} setFlag={setFlag} label={'بیلنس ٹیلی'} />

                </Box>

                {/* dialog fields */}
                <Box
                    sx={{
                        px: 1,
                        py: 1,
                        display: "flex",
                        gap: 2,
                        flexDirection: 'row-reverse',
                        justifyContent: "space-between",
                        // alignItems: "center",
                    }}
                >
                    <Box
                        sx={{
                            width: { xs: '45%', sm: '50%', md: '30%' },
                            display: "grid",
                            gap: 2,
                            gridTemplateColumns: "repeat(1, 1fr)",
                        }}
                    >
                        {dialogFields.map((field) => (
                            <TextField
                                label={field.name}
                                fullWidth
                                disabled={field.disabled}
                                inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                sx={{
                                    ...bigger,
                                    textAlign: 'left',

                                    "& .MuiInputLabel-root": {
                                        fontSize: "2.25rem!important", // ⬅️ Increase size
                                        fontWeight: "bold", // ⬅️ Make bold
                                        fontFamily: "jameel noori nastaleeq, serif!important",
                                        color: "black!important", // ⬅️ Change color if needed
                                        letterSpacing: "normal",
                                        right: 0,
                                        left: "auto",
                                        // transformOrigin: "top right",
                                        // paddingBottom: '5rem',
                                    },
                                }}
                                InputProps={{
                                    sx: {
                                        "& .MuiInputBase-input.Mui-disabled": {
                                            WebkitTextFillColor: field.color,
                                        },
                                        textAlign: 'left',
                                        color: field.color,
                                        backgroundColor: field.backgroundColor,
                                    },
                                }}
                                InputLabelProps={{
                                    shrink: true, // keeps label above when filled (optional)
                                }}
                                value={
                                    field.val?.[id] !== undefined
                                        ? formatCurrency(field.val[id])
                                        : field.val !== undefined && field.val !== null
                                            ? formatCurrency(Number(field.val))
                                            : ""
                                }
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleChange(id, e.target.value)}
                            />
                        ))}
                    </Box>
                    <Box
                        sx={{
                            width: { xs: '55%', sm: '50%', md: '30%' },

                        }}
                    >
                        {/* for radio buttons */}
                        <Box
                            sx={{
                                mb: 3,
                                display: "flex",
                                justifyContent: "center",

                            }}
                        >
                            <RadioButtons
                                selected={secondaryFields.map((field) => field.name)}
                                handleChange={handleRadioChange}
                            />
                        </Box>

                        {/* for secondaryFields */}
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', Width: { xs: '80%', sm: '80%', md: '100%' } }}>
                            {secondaryFields.length > 0 &&
                                secondaryFields.map((field) => (
                                    <>
                                        <TextField
                                            label={field.name}
                                            fullWidth
                                            disabled={field.disabled}
                                            // sx={{ ...bigger, textAlign: field.align, mb: 1 }}
                                            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                                            sx={{
                                                ...bigger,
                                                textAlign: field.align,

                                                "& .MuiInputLabel-root": {
                                                    fontSize: "1.5rem!important", // ⬅️ Increase size
                                                    fontWeight: "bold", // ⬅️ Make bold
                                                    fontFamily: "poppins, serif!important",
                                                    color: "black!important", // ⬅️ Change color if needed
                                                    letterSpacing: "normal",
                                                    // paddingBottom: '5rem',
                                                },
                                            }}
                                            InputProps={{
                                                sx: {
                                                    "& .MuiInputBase-input.Mui-disabled": {
                                                        WebkitTextFillColor: field.color,
                                                    },
                                                    textAlign: field.align,
                                                    color: field.color,
                                                    backgroundColor: field.backgroundColor,
                                                },
                                            }}
                                            value={formatCurrency(extra[field.name])}
                                            onFocus={(e) => e.target.select()}
                                            onChange={(e) => field.handleChange(id, e.target.value)}
                                        />
                                    </>
                                ))}
                        </Box>

                    </Box>
                </Box>

                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignContent: "center",
                        width: "100%",
                    }}
                >

                    <SignaturePad watermark={flag ? onChecked : onUnchecked} footer={`${shopper || 0} :نگ موصول ہوا`} />
                </Box>
            </Box>
            {error && <Typography color="error">{error}</Typography>}
        </>
    );
};

export default DeliveryContent;
