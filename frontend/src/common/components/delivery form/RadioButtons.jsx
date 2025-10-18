import React from "react";
import { Checkbox, Box } from "@mui/material";
import { styled } from "@mui/system";

const options = ["Meezan", "JazzCash", "Easypaisa", "Crown"];

export default function RetroCheckboxes({ selected = [], handleChange }) {

    return (
        <StyledWrapper>
            <div className="checkbox-group">
                {options.map((label) => {
                    const checked = selected.includes(label);
                    return (
                        <label
                            key={label}
                            className={`checkbox ${checked ? "checked" : ""}`}
                        >
                            {/* keep checkbox hidden but functional */}
                            <Checkbox
                                checked={checked}
                                onChange={() => handleChange(label)}
                                sx={{
                                    position: "absolute",
                                    opacity: 0,
                                    width: 0,
                                    height: 0,
                                    margin: 0,
                                    padding: 0,
                                }}
                            />
                            <div className="checkbox-visual">
                                <div className="checkbox-dot" />
                            </div>
                            <span className="checkbox-label">{label}</span>
                        </label>
                    );
                })}
            </div>
        </StyledWrapper>
    );
}

const StyledWrapper = styled(Box)`
  .checkbox-group {
    background: #fffdf8;
    border: 2px solid #222;
    border-radius: 0.5rem;
    padding: 0.5rem;
    max-width: 15rem;
    width: 90%;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 1rem;
    position: relative;
    box-shadow: 4px 4px 0 #000;
    font-family: "Noto Sans JP", Arial, sans-serif;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
    position: relative;
    padding: 0.3rem;
    border-radius: 0.3rem;
    transition: background-color 0.2s ease, transform 0.2s ease;
  }

  .checkbox:hover {
    background-color: rgba(209, 17, 17, 0.1);
    transform: translateX(2px);
  }

  /* Custom visual */
  .checkbox-visual {
    width: 1rem;
    height: 1rem;
    border-radius: 0.3rem;
    border: 2px solid #111;
    background: #fdfaf4;
    box-shadow: inset -2px -2px 0 #111, 2px 2px 0 #111;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.25s ease, background-color 0.2s ease;
  }

  .checkbox:hover .checkbox-visual {
    transform: rotate(5deg);
  }

  /* Dot */
  .checkbox-dot {
    width: 70%;
    height: 70%;
    border-radius: 0.2rem;
    background: #d11;
    transform: scale(0);
    transition: transform 0.2s ease-out;
    box-shadow: inset 1px 1px 0 #700, 2px 2px 0 #000;
  }

  /* When checked, show styles */
  .checkbox.checked .checkbox-dot {
    transform: scale(1);
    animation: bounce 0.4s ease-out;
  }

  .checkbox.checked .checkbox-visual {
    background: #ffe0e0;
    border-color: #d11;
    box-shadow: inset -2px -2px 0 #d11, 2px 2px 0 #111;
  }

  .checkbox-label {
    transition: color 0.2s ease, text-shadow 0.2s ease;
  }

  .checkbox.checked .checkbox-label {
    color: #d11;
    text-shadow: 1px 1px 0 #700;
  }

  @keyframes bounce {
    0% {
      transform: scale(0.3);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      transform: scale(1);
    }
  }
`;
