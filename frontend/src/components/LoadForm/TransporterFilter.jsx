import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, Box, MenuItem, Button } from '@mui/material';
import debounce from 'lodash.debounce';
import RefreshIcon from '@mui/icons-material/Refresh';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const TransporterFilter = ({ onFilterChange, onLocalFilterChange, routes, disableAutoSearch, resetDocTrigger, onReset, defaultDateFilter = 'all' }) => {
  const initialFilters = {
    route: '',
    acid: '',
    doc: '',
    dateFilter: defaultDateFilter,
    customDate: new Date().toLocaleDateString('en-CA'),
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

  const inputStyle = {
    "& .MuiInputBase-root": {
      height: 48, // Reduced from 56
      fontSize: "1rem", // Reduced from 1.1rem
      fontWeight: "bold",
    },
    "& .MuiInputLabel-root": {
      fontSize: "1rem", // Reduced from 1.1rem
      fontWeight: "bold",
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      gap: 1, // Reduced from 2
      p: 1,   // Reduced from 2
      bgcolor: '#f8f9fa',
      borderRadius: 2,
      mb: 0.5,
      boxShadow: 1,
      alignItems: 'stretch'
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1, // Reduced from 2
        flexGrow: 1
      }}>
        {/* Row 1: Route (left), Date (right) */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: filters.dateFilter === 'custom' ? '0.8fr 1fr 1.2fr' : '1fr 1fr',
          gap: 0.5,
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
            sx={inputStyle}
            renderInput={(params) => <TextField {...params} label="Route" />}
          />

          <TextField
            select
            label="Date"
            value={filters.dateFilter}
            onChange={(e) => handleInputChange('dateFilter', e.target.value)}
            sx={inputStyle}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="tomorrow">Tomorrow</MenuItem>
            <MenuItem value="custom">Custom</MenuItem>
          </TextField>

          {filters.dateFilter === 'custom' && (
            <DatePicker
              selected={filters.customDate ? new Date(filters.customDate) : null}
              onChange={(date) => {
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  handleInputChange('customDate', `${yyyy}-${mm}-${dd}`);
                }
              }}
              dateFormat="dd-MMM-yy"
              customInput={
                <TextField
                  label="Date"
                  sx={{ 
                    ...inputStyle, 
                    "& .MuiInputBase-input": { 
                      fontSize: '0.8rem',
                      padding: '8px 4px'
                    } 
                  }}
                  InputLabelProps={{ shrink: true }}
                />
              }
            />
          )}
        </Box>

        {/* Row 2: ACID (left), Doc # (right) */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0.5, // Reduced from 1
          width: '100%',
        }}>
          <TextField
            label="ACID"
            type="number"
            value={filters.acid}
            onChange={(e) => handleInputChange('acid', e.target.value)}
            sx={inputStyle}
          />

          <TextField
            label="Doc #"
            type="number"
            value={filters.doc}
            onChange={(e) => handleInputChange('doc', e.target.value)}
            sx={inputStyle}
          />
        </Box>
      </Box>

      {/* Right side: Reset Button spanning both rows */}
      <Button
        variant="contained"
        color="warning"
        onClick={handleReset}
        sx={{
          minWidth: '100px',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          fontWeight: 'bold',
          lineHeight: 1.2,
          fontSize: '1rem'
        }}
      >
        <RefreshIcon sx={{ fontSize: '2rem' }} />
        RESET
      </Button>
    </Box>
  );
};

export default TransporterFilter;