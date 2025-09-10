import { Box, Button } from "@mui/material";

export default function UploadButtons({ handleImageChange }) {
    return (
        <Box
            sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, width: "100%" }}
        >
            {/* Customer photo input */}
            <input
                accept="image/*"
                capture="user"
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
                    fullWidth
                    sx={{ fontSize: "1.2rem" }}
                >
                    Customer
                </Button>
            </label>

            {/* Shop photo input */}
            <input
                accept="image/*"
                capture="environment"
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
                    fullWidth
                    sx={{ fontSize: "1.2rem" }}
                >
                    Shop
                </Button>
            </label>

            {/* Agreement photo input */}
            <input
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                id="agreement-upload"
                type="file"
                onChange={(e) => handleImageChange(e, "agreement")}
            />
            <label htmlFor="agreement-upload">
                <Button
                    variant="contained"
                    component="span"
                    color="secondary"
                    fullWidth
                    sx={{ fontSize: "1.2rem" }}
                >
                    Agreement
                </Button>
            </label>
        </Box>
    );
}
