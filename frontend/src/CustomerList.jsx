import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, IconButton, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import Search from './Search';
import DataTable from './table';

const CustomerList = ({ customer = [], onCustomerDeleted }) => {
  const listRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState(customer);

  useEffect(() => {
    setFilteredCustomers(customer);
  }, [customer]);

  useEffect(() => {
    const handleResize = () => {
      if (listRef.current) {
        const isOverflowing = listRef.current.scrollHeight > listRef.current.clientHeight;
        setIsOverflowing(isOverflowing);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [customer]);

  // ✅ Function to handle deletion
  const handleDelete = (id) => {
    setFilteredCustomers((prevCustomers) =>
      prevCustomers.filter((customer) => customer.customerId !== id)
    );
  };
  

  const handleCustomerSearch = (filteredCustomers) => {
    setFilteredCustomers(filteredCustomers);
  };

  const customerColumns = [
    { id: 'acid', label: 'Id' },
    { id: 'name', label: 'Name', maxWidth: 200 },
    // { id: 'OAddress', label: 'Address' },
    { id: 'SPO', label: 'SPO' },
    { id: 'route', label: 'Route' },
    { 
      id: 'delete', 
      label: 'Delete',
      render: (row) => (
        <IconButton onClick={() => handleDelete(row.customerId)} aria-label="delete">
          <DeleteIcon />
        </IconButton>
      )
    }
  ];

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, marginRight: 2, height: '100%', width: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom align='center' fontWeight="bold">
          Customer List
        </Typography>
        <br />
        <br />
        <br />
        <Search type="customer" onSearch={handleCustomerSearch} />
        <br />
        <br />
        <div ref={listRef} style={{ overflowY: isOverflowing ? 'scroll' : 'auto' }}>
          {filteredCustomers.length === 0 ? (
            <Typography variant="body2">No customers available</Typography>
          ) : (
            <DataTable
              data={filteredCustomers}
              columns={customerColumns}
              onDelete={handleDelete}
              rowKey="customerId"
              apiEndpoint="customers"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerList;
