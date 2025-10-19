import React from 'react';
import { List, ListItem, ListItemText, Typography, Box, Button } from '@mui/material';
import { formatCurrency } from '../../utils/formatCurrency';
import ClearIcon from '@mui/icons-material/Clear';
export const EntriesListSection = ({ entries = [], onSyncOneEntry, onRemove }) => {
    if (entries.length === 0) {
        return <Typography variant="body2" color="text.secondary">No entries added yet.</Typography>;
    }

    return (
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
                                gap: 2,
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
                            {/* <Button onClick={() => onRemove(entry.creditID)}
                                sx={{
                                    color: 'red'
                                }}>
                                <ClearIcon />
                            </Button> */}

                            <Typography
                                variant="caption"
                                sx={{
                                    ml: 1,
                                    fontWeight: 'bold',
                                    color: entry.status ? 'success.main' : 'warning.main',
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
    );
};

export default EntriesListSection;


