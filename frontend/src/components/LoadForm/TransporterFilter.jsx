import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Autocomplete, TextField, Box, Button } from '@mui/material';
import debounce from 'lodash.debounce';

const TransporterFilter = ({ onFilterChange, onLocalFilterChange, routes, disableAutoSearch }) => {
  const [filters, setFilters] = useState({
    route: '',
    acid: '',
    doc: '',
    dateSort: 'DESC',
    docSort: ''
  });

  const handleInputChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    if (typeof onLocalFilterChange === 'function') {
      onLocalFilterChange(newFilters);
    }
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
    if (!disableAutoSearch) {
      debouncedFilterChange(filters);
    }
    return () => debouncedFilterChange.cancel();
  }, [filters, debouncedFilterChange, disableAutoSearch]);

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
          type="number"
          value={filters.acid}
          onChange={(e) => handleInputChange('acid', e.target.value)}
        />

        <TextField
          label="Doc #"
          size="small"
          type="number"
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
          <option value="None"></option>
          <option value="DESC">Highest First</option>
          <option value="ASC">Lowest First</option>
        </TextField>
      </Box>
    </Box>
  );
};

export default TransporterFilter;