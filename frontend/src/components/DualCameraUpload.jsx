import { Box } from "@mui/material";
import UploadButtons from "./UploadButtons";
import ImagePreview from "./ImagePreview";

export default function DualCameraUpload({ images, handleImageChange, loading }) {
    return (
        <Box display="flex" flexDirection="column" gap={3} marginY={5} alignItems="center">
            <UploadButtons handleImageChange={handleImageChange} />
            <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                <ImagePreview images={images} loading={loading} />
            </Box>
        </Box>
    );
}
