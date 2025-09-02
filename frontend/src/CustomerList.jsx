// CustomerList.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, IconButton, Divider, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import Search from './Search';
import DataTable from './table';

const CustomerList = ({ customer = [], onCustomerDeleted, tableHeight }) => {
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

  // You can define this in the same file where you use the DataTable

  const customerColumns = [
    {
      id: 'acid',
      label: 'Id',
      minWidth: 80 // ID columns can be narrower
    },
    {
      id: 'name',
      label: 'Name',
      minWidth: { xs: 200, md: 500, lg: 500, xl: 750 }, // Give the name column more space
    },
    {
      id: 'SPO',
      label: 'SPO',
      minWidth: 200 // A medium width
    },
    {
      id: 'route',
      label: 'Route',
      minWidth: 150,
      align: 'center'
    },

  ];

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, height: '100%', }}>
      <CardContent>
        <Search type="customer" onSearch={handleCustomerSearch} />
        <div ref={listRef} style={{ overflowY: isOverflowing ? 'scroll' : 'auto' }}>
          {filteredCustomers?.length === 0 ? (
            <Typography variant="body2">No customers available</Typography>
          ) : (
            <Box sx={{ marginY: 2, overflow: 'scroll' }}>
              <DataTable
                data={filteredCustomers}
                columns={customerColumns}
                rowKey="customerId"
                apiEndpoint="customers"
                tableHeight={tableHeight}
                usage="coa"
              />
            </Box>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerList;