import React from "react";
import { Box, Typography } from "@mui/material";
import { fontFamily, styled } from "@mui/system";

const Checkbox = ({ flag, setFlag, label }) => {
    const handleChange = (e) => {
        setFlag(e.target.checked);
    };

    return (
        <StyledWrapper>
            <Box className="checkbox-wrapper">

                <input
                    id="custom-checkbox"
                    name="checkbox"
                    type="checkbox"
                    checked={flag}
                    onChange={handleChange}
                />

                <label className="terms-label" htmlFor="custom-checkbox">
                    <Typography className="label-text">{label}</Typography>

                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 200 200"
                        className="checkbox-svg"
                    >
                        <mask fill="white" id="path-1-inside-1">
                            <rect height={200} width={200} />
                        </mask>
                        <rect
                            mask="url(#path-1-inside-1)"
                            strokeWidth={40}
                            className="checkbox-box"
                            height={200}
                            width={200}
                        />
                        <path
                            strokeWidth={15}
                            d="M52 111.018L76.9867 136L149 64"
                            className="checkbox-tick"
                        />
                    </svg>
                </label>
            </Box>
        </StyledWrapper>
    );
};

const StyledWrapper = styled(Box)(() => ({
    ".checkbox-wrapper input[type='checkbox']": {
        display: "none",
    },

    ".checkbox-wrapper .terms-label": {
        cursor: "pointer",
        display: "flex",
        alignItems: "center",

    },

    ".checkbox-wrapper .label-text": {
        marginRight: "10px",
        fontSize: "2rem",
        userSelect: "none",
        fontFamily: 'jameel noori nastaleeq, serif'


    },

    ".checkbox-wrapper .checkbox-svg": {
        width: "30px",
        height: "30px",
    },

    ".checkbox-wrapper .checkbox-box": {
        fill: "rgba(207, 205, 205, 0.425)",
        stroke: "#8c00ff",
        strokeDasharray: 800,
        strokeDashoffset: 800,
        transition: "stroke-dashoffset 0.6s ease-in",
    },

    ".checkbox-wrapper .checkbox-tick": {
        stroke: "#8c00ff",
        strokeDasharray: 172,
        strokeDashoffset: 172,
        transition: "stroke-dashoffset 0.6s ease-in",
    },

    ".checkbox-wrapper input[type='checkbox']:checked + .terms-label .checkbox-box, \
  .checkbox-wrapper input[type='checkbox']:checked + .terms-label .checkbox-tick": {
        strokeDashoffset: 0,
    },
}));

export default Checkbox;
