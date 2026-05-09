import React from 'react';
import { Button, FormControl, RadioGroup, FormControlLabel, Radio, Box, Typography } from '@mui/material';

export const FormActionsSection = ({
    onAddEntry,
    onSubmitAndReset,
    isAddEntryDisabled,
    isLoading,
    submitButtonDisabled,
    form = 'recovery',
    imageStatus,
    onImageStatusChange,
}) => {
    return (
        <>
            {form === 'recovery' && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1, mt: 1 }}>
                        <Button
                            variant="contained"
                            fullWidth
                            onClick={onAddEntry}
                            disabled={isAddEntryDisabled}
                            sx={{
                                fontSize: '1.5rem',
                                padding: '10px 0',
                            }}
                        >
                            Add Entry
                        </Button>
                </Box>
            )}
            <Button
                variant="contained"
                fullWidth
                color="error"
                sx={{ mt: 2, fontSize: '1.2rem' }}
                onClick={onSubmitAndReset}
                disabled={isLoading || submitButtonDisabled}
            >
                Submit and Reset All
            </Button>
        </>
    );
};

export default FormActionsSection;



