// src/components/ErrorAlert.jsx
import { Alert } from "@mui/material";

export default function ErrorAlert({ error, setError }) {
    if (!error) return null;
    return (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
        </Alert>
    );
}
