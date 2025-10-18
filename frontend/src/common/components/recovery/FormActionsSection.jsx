import React from 'react';
import { Button } from '@mui/material';

export const FormActionsSection = ({
    onAddEntry,
    onSubmitAndReset,
    isAddEntryDisabled,
    isLoading,
    submitButtonDisabled
}) => {
    console.log("Submit Button Disabled:", submitButtonDisabled);
    return (
        <>
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


