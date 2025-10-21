import React, { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Box, Button } from "@mui/material";

const SignaturePad = ({ watermark = "", footer = "" }) => {
  const sigCanvas = useRef(null);

  useEffect(() => {
    clear();

  }, [watermark]);

  const clear = () => {
    sigCanvas.current?.clear();

    // redraw watermark after clearing
    const canvas = sigCanvas.current?.getCanvas();
    if (canvas && watermark) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.save(); // Save the current canvas state

        // Move the origin to the center of the canvas
        ctx.translate(canvas.width / 2, canvas.height / 2);

        // Rotate the canvas (in radians, so 45° = Math.PI / 4)
        ctx.rotate(-Math.PI / 4);

        // Set font style
        ctx.font = "80px jameel noori nastaleeq";
        ctx.fillStyle = "rgba(0, 0, 0, 0.13)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle"; // ensures perfect centering vertically

        // Draw the watermark at the new origin
        ctx.fillText(watermark, 0, 0);

        ctx.restore(); // Restore the original canvas state

        // ----- Bottom Filled Text -----
        ctx.font = "40px jameel noori nastaleeq"; // smaller font for bottom text
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        // ctx.letterSpacing = 'normal';
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText(footer, canvas.width / 2, canvas.height - 10);
      }
    }
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} alignItems="center">
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        canvasProps={{
          width: 450,
          height: 400,
          className: "sigCanvas",
          style: { backgroundColor: "lightgrey", border: "1px solid #ccc" },
        }}
      />

      <Button variant="contained" color="error" onClick={() => {
        const conformation = window.confirm('do you want to clear?');
        if (!conformation) return;
        clear()
      }}>
        Clear
      </Button>
    </Box>
  );
};

export default SignaturePad;
