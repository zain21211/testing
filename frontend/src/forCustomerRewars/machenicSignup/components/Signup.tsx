import React from "react";
import { TextField, Button, Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

const fields = [
    { name: "firstname", label: "Firstname", type: "text", half: true },
    { name: "lastname", label: "Lastname", type: "text", half: true },
    { name: "email", label: "Email", type: "email" },
    { name: "password", label: "Password", type: "password" },
    { name: "confirmPassword", label: "Confirm password", type: "password" },
];


const Signup = ({ handleSubmit, data }: { handleSubmit: (data: any) => void; data: any }) => {
    return (
        <StyledWrapper>
            <Box component="form" className="form">
                <Typography className="title">Register</Typography>
                <Typography className="message">
                    Signup now and get full access to our app.
                </Typography>

                {/* Dynamic Rendering */}
                <Box className="flex-wrapper">
                    {fields.map((f) => (
                        <Box
                            key={f.name}
                            className={f.half ? "half-field" : "full-field"}
                        >
                            <TextField
                                label={f.label}
                                type={f.type}
                                fullWidth
                                required
                                variant="outlined"
                                InputProps={{ className: "input" }}
                                InputLabelProps={{ className: "input-label" }}
                            />
                        </Box>
                    ))}
                </Box>

                <Button className="submit" variant="contained" fullWidth onClick={handleSubmit}>
                    Submit
                </Button>

                <Typography className="signin">
                    Already have an account? <a href="#">Signin</a>
                </Typography>
            </Box>
        </StyledWrapper>
    );
};

const StyledWrapper = styled("div")(() => ({
    ".form": {
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        // maxWidth: "350px",
        padding: "20px",
        borderRadius: "20px",
        backgroundColor: "#1a1a1a",
        color: "#fff",
        border: "1px solid #333",
    },

    ".title": {
        fontSize: "28px",
        fontWeight: 600,
        letterSpacing: "-1px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        paddingLeft: "30px",
        color: "#00bfff",
    },

    ".title::before, .title::after": {
        position: "absolute",
        content: '""',
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        left: 0,
        backgroundColor: "#00bfff",
    },

    ".title::after": {
        animation: "pulse 1s linear infinite",
    },

    "@keyframes pulse": {
        from: { transform: "scale(0.9)", opacity: 1 },
        to: { transform: "scale(1.8)", opacity: 0 },
    },

    ".message, .signin": {
        fontSize: "14.5px",
        color: "rgba(255,255,255,0.7)",
    },

    ".signin": { textAlign: "center" },

    ".signin a": {
        color: "#00bfff",
        textDecoration: "none",
    },

    ".signin a:hover": {
        textDecoration: "underline royalblue",
    },

    ".flex-wrapper": {
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
    },

    ".half-field": {
        flex: "1 1 calc(50% - 6px)",
    },

    ".full-field": {
        flex: "1 1 100%",
    },

    /* Field Styling */
    ".input": {
        backgroundColor: "#333 !important",
        color: "#fff !important",
        borderRadius: "10px !important",
    },

    ".input-label": {
        color: "rgba(255,255,255,0.5) !important",
    },

    ".submit": {
        backgroundColor: "#00bfff !important",
        color: "#fff",
        padding: "10px",
        borderRadius: "10px",
        fontSize: "16px",
    },

    ".submit:hover": {
        backgroundColor: "#00bfff96 !important",
    },
}));

export default Signup;
