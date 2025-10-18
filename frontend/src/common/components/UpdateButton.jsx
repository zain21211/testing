import { Button, CircularProgress, Box } from '@mui/material';

const UpdateButton = ({ loading, onClick }) => {
    return (
        <Box sx={{ mt: 3, textAlign: "center" }}>
            <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={loading}
                onClick={onClick}
                sx={{ minWidth: "300px", fontSize: "2rem", frontWeight: "bold" }}
            >
                {loading ? <CircularProgress size={24} /> : "UPDATE"}
            </Button>
        </Box>
    );
};

export default UpdateButton;