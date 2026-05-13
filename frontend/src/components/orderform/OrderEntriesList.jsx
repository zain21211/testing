import React from 'react';
import { 
    Box, Typography, List, ListItem, ListItemText, 
    Divider, IconButton, Chip 
} from '@mui/material';
import { 
    CheckCircle, 
    HourglassEmpty, 
    ChevronLeft, 
    ReceiptLong 
} from '@mui/icons-material';
import { formatCurrency } from '../../utils/formatCurrency';

export const OrderEntriesList = ({ orders = [], pendingCount = 0, onSyncOne }) => {
    if (orders.length === 0) {
        return (
            <Box sx={{ mt: 4, p: 3, textAlign: 'center', border: '1px dashed #ccc', borderRadius: 2 }}>
                <Typography color="textSecondary" sx={{ fontSize: '1.2rem' }}>آج کا کوئی آرڈر نہیں ملا</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ mt: 4, direction: 'rtl' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: 'Jameel Noori Nastaleeq, serif', fontSize: '2.1rem' }}>
                    آج کے آرڈر ({orders.length})
                </Typography>
                {pendingCount > 0 && (
                    <Chip 
                        label={`${pendingCount} پینڈنگ`} 
                        color="warning" 
                        size="small" 
                        sx={{ fontWeight: 'bold' }} 
                    />
                )}
            </Box>
            
            <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #eee', overflow: 'hidden' }}>
                {orders.map((order, index) => {
                    const isSynced = !!order.synced;
                    return (
                        <React.Fragment key={order.transactionID || index}>
                            <ListItem 
                                onClick={() => !isSynced && onSyncOne(order)}
                                sx={{ 
                                    py: 1.5, 
                                    px: 2,
                                    cursor: isSynced ? 'default' : 'pointer',
                                    bgcolor: isSynced ? '#e8f5e9' : '#fffde7', // light green for synced, yellow for pending
                                    '&:hover': { bgcolor: isSynced ? '#c8e6c9' : '#fff9c4' },
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 2
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isSynced ? (
                                        <CheckCircle color="success" fontSize="small" />
                                    ) : (
                                        <HourglassEmpty color="warning" fontSize="small" />
                                    )}
                                    <Box>
                                        <Typography sx={{ fontWeight: 'bold', fontSize: '1.3rem', fontFamily: 'Jameel Noori Nastaleeq, serif' }}>
                                            {order.UrduName || order.customerName} - {order.customerAcid}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
                                            {order.route}{order.rno ? ` - ${order.rno}` : ''}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                    <Typography sx={{ fontWeight: 'bold', color: '#1976d2', fontSize: '1.1rem' }}>
                                        {formatCurrency(order.totalAmount)}
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, direction: 'ltr' }}>
                                        {order.doc && (
                                            <Typography sx={{ bgcolor: '#e0e0e0', px: 1, borderRadius: 1, fontSize: '1rem', fontWeight: 'bold', color: 'black' }}>
                                                {order.doc}
                                            </Typography>
                                        )}
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
                                            {order.orderDate?.split('T')[0]}
                                        </Typography>
                                    </Box>
                                </Box>
                            </ListItem>
                            {index < orders.length - 1 && <Divider />}
                        </React.Fragment>
                    );
                })}
            </List>
        </Box>
    );
};

export default OrderEntriesList;
