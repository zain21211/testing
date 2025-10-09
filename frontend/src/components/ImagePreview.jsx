import { Box, Dialog } from "@mui/material";
import { useState } from "react";

export default function ImagePreview({ images, loading }) {
    const [open, setOpen] = useState(false);
    const [selectedImg, setSelectedImg] = useState(null);

    const handleOpen = (img) => {
        setSelectedImg(img);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setSelectedImg(null);
    };

    return (
        <Box
            mt={2}
            display="flex"
            flexDirection="row"
            flexWrap="wrap"
            gap={1}
            justifyContent={"center"}
            alignItems="center"
        >
            {loading && <p>Loading images...</p>}
            {images.customer && (
                <Box onClick={() => handleOpen(images.customer)} sx={{ cursor: "pointer" }}>
                    <h3>Customer Photo:</h3>
                    <img
                        src={images.customer}
                        alt="customer"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                    />
                </Box>
            )}

            {images.shop && (
                <Box onClick={() => handleOpen(images.shop)} sx={{ cursor: "pointer" }}>
                    <h3>Shop Photo:</h3>
                    <img
                        src={images.shop}
                        alt="shop"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                    />
                </Box>
            )}

            {images.agreement && (
                <Box onClick={() => handleOpen(images.agreement)} sx={{ cursor: "pointer" }}>
                    <h3>Agreement Photo:</h3>
                    <img
                        src={images.agreement}
                        alt="agreement"
                        style={{ maxWidth: "200px", borderRadius: "8px" }}
                    />
                </Box>
            )}

            {/* Enlarged Image Dialog */}
            <Dialog open={open} onClose={handleClose} maxWidth="lg">
                {selectedImg && (
                    <img
                        src={selectedImg}
                        alt="enlarged"
                        style={{ maxWidth: "90vw", maxHeight: "90vh" }}
                    />
                )}
            </Dialog>
        </Box>
    );
}
