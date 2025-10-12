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
import { useState } from "react";
const biggerInputTextSize = "1.4rem"; // For text inside input fields
const biggerShrunkLabelSize = "0.9rem"; // For labels when they shrink (float above)
const biggerCheckboxLabelSize = "1rem"; // For checkbox labels

const bigger = {
    "& .MuiInputBase-input.Mui-disabled": {
        textAlign: "right",
        fontWeight: "bold",
        fontFamily: "'Poppins', sans-serif",
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
        textAlign: "right",
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
    name,
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

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);
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
                <Box
                    sx={{
                        px: 1,
                        py: 1,
                        display: "flex",
                        gap: 2,
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Box
                        sx={{
                            width: "47%",
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
                                sx={{
                                    ...bigger,
                                    textAlign: field.align,

                                    "& .MuiInputLabel-root": {
                                        fontSize: "2.25rem!important", // ⬅️ Increase size
                                        fontWeight: "bold", // ⬅️ Make bold
                                        fontFamily: "jameel noori nastaleeq, serif!important",
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
                            width: { xs: "55%", sm: "55%", md: "auto" },
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

                        {secondaryFields.length > 0 &&
                            secondaryFields.map((field) => (
                                <>
                                    <TextField
                                        label={field.name}
                                        fullWidth
                                        disabled={field.disabled}
                                        sx={{ ...bigger, textAlign: field.align, mb: 1 }}
                                        InputProps={{
                                            sx: {
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
                        <Typography
                            fontSize={"2rem"}
                            fontWeight={"BOLD"}
                            backgroundColor={"pink"}
                            textAlign={"right"}
                            margin={"auto"}
                            sx={{
                                dir: "rtl",
                                px: 1,
                            }}
                        >
                            <u>{shopper || 0}</u> :
                            <span
                                style={{
                                    fontFamily: "Jameel Noori Nastaleeq, serif",
                                    letterSpacing: "normal",
                                    fontSize: "2.5rem",
                                }}
                            >
                                {" "}
                                نگ موصول ہوا
                            </span>
                        </Typography>
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
                    <SignaturePad />
                </Box>
            </Box>
            {error && <Typography color="error">{error}</Typography>}
        </>
    );
};

export default DeliveryContent;
