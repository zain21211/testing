import { useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogActions,
} from "@mui/material";

export default function UploadButtons({ handleImageChange }) {
    const [open, setOpen] = useState(false);
    const [currentType, setCurrentType] = useState("");

    // Open the dialog for selected type
    const handleOpen = (type) => {
        setCurrentType(type);
        setOpen(true);
    };

    // Handle file input click
    const handleSelect = (source) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";

        // If user chose camera, add capture
        if (source === "camera") input.capture = "environment";

        input.onchange = (e) => handleImageChange(e, currentType);
        input.click();
        setOpen(false);
    };

    return (
        <>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 2,
                    width: "100%",
                }}
            >
                {[
                    { label: "Customer", color: "primary" },
                    { label: "Shop", color: "secondary" },
                    { label: "Agreement", color: "secondary" },
                ].map(({ label, color }) => (
                    <Button
                        key={label}
                        variant="contained"
                        color={color}
                        fullWidth
                        sx={{ fontSize: "1.2rem" }}
                        onClick={() => handleOpen(label.toLowerCase())}
                    >
                        {label}
                    </Button>
                ))}
            </Box>

            {/* Dialog for choosing source */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Select Image Source</DialogTitle>
                <DialogActions sx={{ flexDirection: "column", gap: 1, p: 2 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleSelect("camera")}
                    >
                        📸 Take Photo
                    </Button>
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => handleSelect("file")}
                    >
                        🖼️ Choose from Gallery
                    </Button>
                    <Button color="error" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
