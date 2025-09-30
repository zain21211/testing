import React from "react";
import {
    Card as MuiCard,
    CardContent,
    Typography,
    IconButton,
    Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const Ribbon = ({ color = "indianred", height = 100 }) => {
    const step = 10; // vertical step between waves
    let d = "M 8 0 "; // start in the middle top

    for (let y = step; y <= height; y += step) {
        // alternating between curve (Q) and straight reflection (T)
        if (y % (2 * step) === 0) {
            d += `T 8 ${y} `;
        } else {
            d += `Q 4 ${y - step / 2}, 8 ${y} `;
        }
    }

    // close the shape at the bottom
    d += `L 0 ${height} L 0 0 Z`;

    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={16} height={height}>
            <path
                strokeLinecap="round"
                strokeWidth={2}
                stroke={color}
                fill={color}
                d={d}
            />
        </svg>
    );
};

const Card = ({ text, code, onClose, color = "indianred" }) => {
    return (
        <MuiCard
            elevation={4}
            sx={{
                position: "absolute",
                zIndex: 50,
                display: "flex",
                width: "60%",
                maxWidth: 500, // same as max-w-96
                height: 130,
                overflow: "hidden",
                bgcolor: "white",
                borderRadius: 3,
                boxShadow: 3,
            }}
        >
            {/* Left SVG Ribbon */}
            <Ribbon color={color} height={130} />



            {/* Content */}
            <CardContent
                sx={{
                    flex: 1,
                    px: 2,
                    py: 2,
                    overflow: "hidden",
                    fontSize: '2rem'
                }}
            >
                <Typography
                    variant="h5"
                    sx={{
                        mt: 0.5,
                        fontWeight: "bold",
                        color: color,
                        lineHeight: 1.8,
                        mr: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {code} !
                </Typography>
                <Typography
                    variant="body1"
                    sx={{
                        color: "text.secondary",
                        lineHeight: 1.25,
                        maxHeight: 40,
                        overflow: "hidden",
                        fontWeight: 'bold',
                        textTransform: "uppercase",
                        wordBreak: "break-all",
                    }}
                >
                    <br />
                    {text}
                </Typography>
            </CardContent>

            {/* Close Button */}
            <Box sx={{ display: onClose ? "flex" : 'none', alignItems: "flex-start", p: 1 }}>
                <IconButton
                    size="small"
                    onClick={onClose}
                    sx={{
                        width: 32,
                        height: 32,
                        color: "indianred",
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </Box>
        </MuiCard>
    );
};

export default Card;
