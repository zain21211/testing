// CustomerList.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, Typography, IconButton, Divider, Box } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Search from './Search';
import DataTable from '../table';
import useWindowDimensions from '../useWindowDimensions';
import table from '../table';

const CustomerList = ({ customer = [], onCustomerDeleted, tableHeight: gtableHeight }) => {
  const listRef = useRef(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState(customer);
  const { height } = useWindowDimensions(); // Get window height
  const containerRef = useRef(null);
  const [tableHeight, setTableHeight] = useState(0);

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
      minWidth: { xs: 200, md: 400, lg: 490, xl: 750 }, // Give the name column more space
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

  useEffect(() => {
    if (containerRef.current) {
      const divHeight = containerRef.current.offsetHeight;
      console.log("Div height:", divHeight, "gtableHeight:", gtableHeight);
      setTableHeight(gtableHeight - divHeight - 120);
    }
  }, []);

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2, }}>
      <CardContent>
        <Box
          ref={containerRef}
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Search type="customer" onSearch={handleCustomerSearch} />
        </Box>
        <div ref={listRef} style={{ overflowY: isOverflowing ? 'scroll' : 'auto' }}>
          {filteredCustomers?.length === 0 ? (
            <Typography variant="body2">No customers available</Typography>
          ) : (
            <Box sx={{ marginTop: 2 }}>
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