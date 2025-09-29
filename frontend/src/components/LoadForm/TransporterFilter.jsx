import React, { useState } from 'react';
import { Autocomplete, TextField, Button, Box } from '@mui/material';

const transporters = [
  { label: 'supply van' },
  { label: 'arif' },
  { label: 'salman' },
];


const TransporterFilter = ({ onFilterChange, routes }) => {
  const [route, setRoute] = useState('');
  return (
    <Box sx={{
      display: 'flex',
      gap: 2,
      justifyContent: 'center',
      alignItems: 'center'
    }}>

      <Autocomplete
        freeSolo
        disablePortal
        id="route-autocomplete"
        options={routes}
        sx={{ width: 300 }}
        onInputChange={(e, val) => {
          setRoute(val)
        }}
        onChange={(event, newValue) => {
          onFilterChange(newValue ? newValue : null);
        }}
        renderInput={(params) => <TextField {...params} label="route" />}
      />


      <Button
        variant='contained'
        sx={{
          fontSize: '1.5rem'
          , minWidth: 100
        }}
        onClick={() => onFilterChange()}>ALL</Button>

    </Box>
  );
};

export default TransporterFilter;