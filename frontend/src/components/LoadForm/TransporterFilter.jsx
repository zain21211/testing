import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, Box, MenuItem } from '@mui/material';
import debounce from 'lodash.debounce';

const TransporterFilter = ({ onFilterChange, onLocalFilterChange, routes, disableAutoSearch, resetDocTrigger }) => {
  const [filters, setFilters] = useState({
    route: '',
    acid: '',
    doc: '',
    dateFilter: 'all',
  });

  useEffect(() => {
    if (resetDocTrigger) {
      setFilters(prev => ({ ...prev, doc: '' }));
    }
  }, [resetDocTrigger]);

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
      {/* Row 1: Route (left), Date (right) */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        width: '100%',
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
          select
          label="Date"
          size="small"
          value={filters.dateFilter}
          onChange={(e) => handleInputChange('dateFilter', e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="today">Today</MenuItem>
        </TextField>
      </Box>

      {/* Row 2: ACID (left), Doc # (right) */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 2,
        width: '100%',
      }}>
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
      </Box>
    </Box>
  );
};

export default TransporterFilter;