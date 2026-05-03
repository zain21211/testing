import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Box, Button } from '@mui/material';
import debounce from 'lodash.debounce';

const TransporterFilter = ({ onFilterChange, routes }) => {
  const [filters, setFilters] = useState({
    route: '',
    acid: '',
    doc: '',
    dateSort: 'DESC',
    docSort: ''
  });

  // Use a function declaration to ensure hoisting within the component
  function handleGet() {
    console.log('handleGet called with filters:', filters);
    if (typeof onFilterChange === 'function') {
      onFilterChange(filters);
    }
  }

  const handleInputChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const debouncedFilterChange = useMemo(
    () => debounce((newFilters) => {
      if (typeof onFilterChange === 'function') {
        onFilterChange(newFilters);
      }
    }, 500),
    [onFilterChange]
  );

  useEffect(() => {
    debouncedFilterChange(filters);
    return () => debouncedFilterChange.cancel();
  }, [filters, debouncedFilterChange]);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      p: 2,
      bgcolor: '#f8f9fa',
      borderRadius: 2,
      mb: 2,
      boxShadow: 1
    }}>
      {/* Filters Row */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)', lg: '250px 150px 150px' },
        gap: 1,
        width: '100%',
        justifyContent: 'center'
      }}>
        <Autocomplete
          freeSolo
          disablePortal
          id="route-autocomplete"
          options={routes || []}
          onInputChange={(e, val) => handleInputChange('route', val)}
          onChange={(event, newValue) => {
            const newRoute = newValue ? newValue : '';
            handleInputChange('route', newRoute);
          }}
          renderInput={(params) => <TextField {...params} size="small" label="Route" />}
        />

        <TextField
          label="ACID"
          size="small"
          value={filters.acid}
          onChange={(e) => handleInputChange('acid', e.target.value)}
        />

        <TextField
          label="Doc #"
          size="small"
          value={filters.doc}
          onChange={(e) => handleInputChange('doc', e.target.value)}
        />

        <TextField
          select
          label="Sort Date"
          size="small"
          value={filters.dateSort || 'DESC'}
          onChange={(e) => handleInputChange('dateSort', e.target.value)}
          SelectProps={{ native: true }}
        >
          <option value="DESC">Newest First</option>
          <option value="ASC">Oldest First</option>
        </TextField>

        <TextField
          select
          label="Sort Doc #"
          size="small"
          value={filters.docSort || ''}
          onChange={(e) => handleInputChange('docSort', e.target.value)}
          SelectProps={{ native: true }}
        >
          <option value="">None</option>
          <option value="DESC">Highest First</option>
          <option value="ASC">Lowest First</option>
        </TextField>
      </Box>

      {/* Button Row */}
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        <Button
          variant='contained'
          sx={{
            height: 45,
            minWidth: 150,
            fontSize: '1rem',
            fontWeight: 'bold',
            borderRadius: 2,
            boxShadow: 2
          }}
          onClick={handleGet}
        >
          SEARCH
        </Button>
      </Box>
    </Box>
  );
};

export default TransporterFilter;