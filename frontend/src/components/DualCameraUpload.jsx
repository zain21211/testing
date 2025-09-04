import { Box, Button } from "@mui/material";

export default function DualCameraUpload({ images, handleImageChange }) {

    return (
        <Box display="flex" flexDirection="column" gap={3} marginTop={5} alignItems="center">
            {" "}
            <Box
                sx={{ display: "grid", gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, width: "100%" }}
            >
                {" "}
                {/* Customer photo input */}
                <input
                    accept="image/*"
                    capture="user" // front camera for customer selfie
                    style={{ display: "none" }}
                    id="customer-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "customer")}
                />
                <label htmlFor="customer-upload">

                    <Button
                        variant="contained"
                        component="span"
                        color="primary"
                        fontSize="1.2rem"
                        width="100%"
                        fullWidth

                        sx={{ fontSize: '1.2rem' }}
                    >
                        Customer
                    </Button>
                </label>
                {/* Shop photo input */}
                <input
                    accept="image/*"
                    capture="environment" // back camera for shop image
                    style={{ display: "none" }}
                    id="shop-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "shop")}
                />
                <label htmlFor="shop-upload">
                    <Button
                        variant="contained"
                        component="span"
                        color="secondary"
                        width="100%"
                        fontSize="1.2rem"
                        fullWidth
                        sx={{ fontSize: '1.2rem', justifySelf: 'stretch' }}
                    >
                        Shop
                    </Button>
                </label>
                {/* Agreement photo input */}
                <input
                    accept="image/*"
                    capture="environment" // back camera for shop image
                    style={{ display: "none" }}
                    id="agreement-upload"
                    type="file"
                    onChange={(e) => handleImageChange(e, "agreement")}
                />
                <label htmlFor="agreement-upload">

                    <Button
                        fullWidth
                        variant="contained"
                        component="span"
                        color="secondary"
                        width="100%"
                        fontSize="1.2rem"
                        sx={{ fontSize: '1.2rem' }}
                    >

                        Agreement
                    </Button>
                </label>
            </Box>
            {/* Preview */}
            <Box
                mt={2}
                display="flex"
                flexDirection="row"
                gap={2}
                alignItems="center"
            >

                {images.customer && (
                    <Box>

                        <h3>Customer Photo:</h3>
                        <img
                            src={images.customer}
                            alt="customer"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />
                    </Box>
                )}
                {images.shop && (
                    <Box>
                        {" "}
                        <h3>Shop Photo:</h3>{" "}
                        <img
                            src={images.shop}
                            alt="shop"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />{" "}
                    </Box>
                )}{" "}
                {images.agreement && (
                    <Box>
                        {" "}
                        <h3>Agreement Photo:</h3>{" "}
                        <img
                            src={images.agreement}
                            alt="shop"
                            style={{ maxWidth: "200px", borderRadius: "8px" }}
                        />{" "}
                    </Box>
                )}{" "}
            </Box>{" "}
        </Box>
    );
}
