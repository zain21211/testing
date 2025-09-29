import React, { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Box, Button } from "@mui/material";

const SignaturePad: React.FC = (target: any) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [signature, setSignature] = useState<string | null >(null);

  const clear = () => {
    sigCanvas.current?.clear();
    // setSignature(null);
  };

  const save = () => {
    const data = target.current?.toDataURL("image/png");
    console.log('data:', typeof data)
    setSignature(data || null); // store in state
    clear();
  };

  return (
    <Box display="flex" flexDirection="column" gap={2} backgroundColor={'black'} p={2}alignItems="center">
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        backgroundColor="white"
        canvasProps={{
          width: 500,
          height: 200,
          className: "border border-gray-400 rounded-lg",
        }}
      />
      <Box display="flex" gap={2}>
        <Button variant="contained" color="error" onClick={clear}>
          Clear
        </Button>
        <Button variant="contained" color="success" onClick={save}>
          Save
        </Button>
      </Box>

      {/* Render signature preview if exists */}
      {signature && (
        <Box mt={3}>
          <img src={signature} alt="Saved Signature" style={{ border: "1px solid #ccc" }} />
        </Box>
      )}
    </Box>
  );
};

export default SignaturePad;
