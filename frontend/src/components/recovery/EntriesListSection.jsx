import React, { useState } from 'react';
import { List, ListItem, ListItemText, Typography, Box, Button, Dialog, DialogContent, IconButton } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import ClearIcon from '@mui/icons-material/Clear';
import CloseIcon from '@mui/icons-material/Close';

export const EntriesListSection = ({ entries = [], onSyncOneEntry, onRemove }) => {
    const [previewImage, setPreviewImage] = useState(null);

    if (entries.length === 0) {
        return <Typography variant="body2" color="text.secondary">No entries added yet.</Typography>;
    }

    return (
        <Box>
            <List
                sx={{
                    bgcolor: 'background.paper',
                    p: 0,
                    maxHeight: 'auto',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                }}
            >
                {entries
                    .slice()
                    .reverse()
                    .map((entry, index) => {
                        const reversedIndex = entries.length - index;
                        const amountDetails = [];

                        if (entry.amounts?.cash > 0)
                            amountDetails.push(
                                <span key="cash" style={{ fontWeight: 'bold', color: 'black' }}>
                                    Cash: {formatCurrency(entry.amounts.cash.toFixed(0))}
                                </span>
                            );
                        if (entry.amounts?.jazzcash > 0)
                            amountDetails.push(
                                `Jazzcash: ${formatCurrency(entry.amounts.jazzcash.toFixed(0))}`
                            );
                        if (entry.amounts?.easypaisa > 0)
                            amountDetails.push(
                                `Easypaisa: ${formatCurrency(entry.amounts.easypaisa.toFixed(0))}`
                            );
                        if (entry.amounts?.crownWallet > 0)
                            amountDetails.push(
                                `Crown Wallet: ${formatCurrency(entry.amounts.crownWallet.toFixed(0))}`
                            );
                        if (entry.amounts?.meezanBank > 0)
                            amountDetails.push(
                                `Meezan Bank: ${formatCurrency(entry.amounts.meezanBank.toFixed(0))}`
                            );
                        if (entry.amounts?.tc > 0)
                            amountDetails.push(
                                `TC: ${formatCurrency(entry.amounts.tc.toFixed(0))}`
                            );
                        if (entry.amounts?.harr > 0)
                            amountDetails.push(
                                `HARR: ${formatCurrency(entry.amounts.harr.toFixed(0))}`
                            );
                        if (entry.amounts?.crownfit > 0)
                            amountDetails.push(
                                `Crown Fit: ${formatCurrency(entry.amounts.crownfit.toFixed(0))}`
                            );

                        return (
                            <ListItem
                                key={`${entry.timestamp}-${entry.id}-${index}`}
                                divider={index < entries.length - 1}
                                onClick={() => {
                                    if (!entry.status) onSyncOneEntry(entry);
                                }}
                                sx={{
                                    paddingY: '6px',
                                    paddingX: '8px',
                                    display: 'flex',
                                    textAlign: 'end',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1.5,
                                    backgroundColor: entry.status ? '#f5f5f5' : '#fffde7',
                                    borderRadius: 1,
                                    '&:not(:last-child)': {
                                        marginBottom: '4px',
                                    },
                                    cursor: entry.status ? 'default' : 'pointer',
                                    '&:hover': {
                                        backgroundColor: entry.status ? '#f5f5f5' : '#fffde7',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {entry.status !== true && (
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRemove(entry.creditID);
                                            }}
                                            sx={{ color: 'red', minWidth: '40px' }}
                                        >
                                            <ClearIcon />
                                        </Button>
                                    )}

                                    {entry.paymentImage && (
                                        <img
                                            src={entry.paymentImage}
                                            alt="Receipt"
                                            style={{
                                                width: 40,
                                                height: 40,
                                                objectFit: 'cover',
                                                borderRadius: 4,
                                                cursor: 'zoom-in',
                                                border: '1px solid #ddd',
                                                marginLeft: 4
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewImage(entry.paymentImage);
                                            }}
                                        />
                                    )}
                                </Box>

                                <Typography
                                    variant="caption"
                                    sx={{
                                        ml: 1,
                                        fontWeight: 'bold',
                                        color: entry.status ? 'success.main' : 'warning.main',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {entry.status ? 'Synced ✅' : 'Pending ⏳'}
                                </Typography>

                                <ListItemText
                                    primary={
                                        <Box component="span" display="inline-flex" alignItems="center" gap={1}>
                                            <span dir="ltr" style={{ fontSize: '.8rem' }}>
                                                {new Date(entry.timestamp).toLocaleString('en-GB', {
                                                    timeZone: 'Asia/Karachi',
                                                    hour12: false,
                                                })}
                                            </span>
                                            <span dir="ltr" style={{ fontSize: '1.5rem' }}>({entry.id})</span>
                                            <span>{entry.UrduName || entry.name}</span>
                                            <span dir="ltr">.{reversedIndex}</span>
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            {amountDetails.map((item, i) => (
                                                <React.Fragment key={i}>
                                                    {item}
                                                    {i < amountDetails.length - 1 && ' | '}
                                                </React.Fragment>
                                            ))}
                                            {' | Total: '}
                                            {formatCurrency(entry.entryTotal?.toFixed(0))}
                                        </>
                                    }
                                    primaryTypographyProps={{
                                        fontWeight: 'bold',
                                        fontSize: '2.3rem',
                                        direction: 'ltr',
                                        letterSpacing: 'normal',
                                        fontFamily: 'Jameel Noori Nastaleeq, serif',
                                    }}
                                    secondaryTypographyProps={{
                                        fontSize: '1rem',
                                        color: 'text.secondary',
                                        direction: 'rtl',
                                    }}
                                />
                            </ListItem>
                        );
                    })}
            </List>

            <Dialog
                open={!!previewImage}
                onClose={() => setPreviewImage(null)}
                maxWidth="md"
                fullWidth
            >
                <DialogContent sx={{ p: 0, position: 'relative', bgcolor: 'black', display: 'flex', justifyContent: 'center', minHeight: '200px' }}>
                    <IconButton
                        onClick={() => setPreviewImage(null)}
                        sx={{ position: 'absolute', right: 8, top: 8, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, zIndex: 1 }}
                    >
                        <CloseIcon />
                    </IconButton>
                    {previewImage && (
                        <img
                            src={previewImage}
                            alt="Full Preview"
                            style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default EntriesListSection;


