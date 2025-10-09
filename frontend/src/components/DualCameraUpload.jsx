import { Box } from "@mui/material";
import UploadButtons from "./UploadButtons";
import ImagePreview from "./ImagePreview";

export default function DualCameraUpload({ images, handleImageChange, loading }) {
    return (
        <Box display="flex" flexDirection="column" gap={3} marginTop={5} alignItems="center">
            <UploadButtons handleImageChange={handleImageChange} />
            <ImagePreview images={images} loading={loading} />
        </Box>
    );
}
