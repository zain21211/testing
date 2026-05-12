import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, Box, MenuItem, Button } from '@mui/material';
import debounce from 'lodash.debounce';
import RefreshIcon from '@mui/icons-material/Refresh';

const TransporterFilter = ({ onFilterChange, onLocalFilterChange, routes, disableAutoSearch, resetDocTrigger, onReset }) => {
  const initialFilters = {
    route: '',
    acid: '',
    doc: '',
    dateFilter: 'all',
  };

  const [filters, setFilters] = useState(initialFilters);

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

  const handleReset = () => {
    setFilters(initialFilters);
    if (typeof onLocalFilterChange === 'function') {
      onLocalFilterChange(initialFilters);
    }
    if (typeof onReset === 'function') {
      onReset();
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
      gap: 2,
      p: 2,
      bgcolor: '#f8f9fa',
      borderRadius: 2,
      mb: 2,
      boxShadow: 1,
      alignItems: 'stretch' // Ensure the button stretches to match fields
    }}>
      {/* Left side: The two rows of filters */}
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        flexGrow: 1
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
            value={filters.route}
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

      {/* Right side: Reset Button spanning both rows */}
      <Button
        variant="contained"
        color="warning"
        onClick={handleReset}
        sx={{
          minWidth: '80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          fontWeight: 'bold',
          lineHeight: 1.2,
          fontSize: '0.85rem'
        }}
      >
        <RefreshIcon />
        RESET
      </Button>
    </Box>
  );
};

export default TransporterFilter;