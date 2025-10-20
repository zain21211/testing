import { useRef, useState } from 'react';
import { Dialog, Box, Button } from "@mui/material";
import { takeScreenShot } from '../../fuctions';

import EntriesListSection from '../recovery/EntriesListSection';

const EntriesDisplay = ({ open, onClose, entries, setEntries, setDoneEntries }) => {
    const user = JSON.parse(localStorage.getItem('user'))
    const target = useRef(null)

    const handleScreenshot = async (target) => {
        await takeScreenShot(target)

        setEntries([]);
    }
    return (
        <Dialog open={open} onClose={onClose}>
            <Box sx={{ m: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box ref={target}>
                    <EntriesListSection
                        entries={entries}
                    />
                </Box>
                <Button variant='contained'
                    onClick={() => {
                        setDoneEntries([]);
                        handleScreenshot(target)
                    }}
                    sx={{
                        display: entries?.length > 0 ? 'block' : 'none',
                    }}>Screenshot</Button>
            </Box>
        </Dialog>
    );
};

export default EntriesDisplay;
