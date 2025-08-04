import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import useLocalStorageState from 'use-local-storage-state';
import { Box, Select, MenuItem, Button, FormControl, InputLabel, Autocomplete, TextField } from '@mui/material';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
const url = `${import.meta.env.VITE_API_URL}`;

// --- STYLING ---
const pageStyles = {
  p: 0,
  m: 0,
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  // background: '#f4f7f6',
  // minHeight: '100vh',
  padding: '20px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'flex-start',
};

const containerStyles = {
  width: '100%',
  maxWidth: '1000px',
  background: 'white',
  borderRadius: '10px',
  padding: '2rem',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
};

const headerStyles = {
  borderBottom: '1px solid #eee',
  paddingBottom: '1rem',
  marginBottom: '1rem',
};

// --- INDIVIDUAL DRAGGABLE ITEM COMPONENT ---
function SortableItem({ id, rno, itemText }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem',
    gap: 10,
    justifyContent: "flex-end",
    margin: '0.5rem 0',
    backgroundColor: isDragging ? '#f0f8ff' : 'white', // A subtle color change on drag
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: isDragging ? '0px 5px 15px rgba(0,0,0,0.2)' : '0px 1px 3px rgba(0,0,0,0.1)',
    opacity: isDragging ? 0.9 : 1,
    transition: transition || 'box-shadow 200ms ease, background-color 200ms ease', // Smooth transition
    transform: CSS.Transform.toString(transform),
  };

  const handleStyle = {
    cursor: 'grab',
    marginLeft: 0,
    padding: '0 8px',
    color: '#555',
    fontWeight: "BOLD",
    fontSize: '1.5rem',
    touchAction: 'none', // important for touch screens
  };


  const rnoStyle = {
    // background: '#eee',


    // marginRight: '1rem',
    maxWidth: 'auto',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: "1.2rem",
    color: '#333',
    flex: 1
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <span style={rnoStyle}>
        <span style={{
          backgroundColor: "#eee", borderRadius: '2rem', padding: '10px 15px', border: "1px black solid"
        }}>
          {rno}

        </span>
      </span>
      <span style={{
        fontSize: "2rem",
        fontWeight: "bold",
        fontFamily: 'Jameel Noori Nastaleeq, serif'
      }}
      >
        {itemText}
      </span>
      <div ref={setActivatorNodeRef} style={handleStyle} {...listeners}>
        ☰
      </div>
    </div>
  );
}


// --- MAIN PAGE COMPONENT ---
const CustomerRouteList = () => {
  const [items, setItems] = useLocalStorageState('items', { defaultValue: [] });
  const [route, setRoute] = useLocalStorageState('route', { defaultValue: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataArray, setDataArray] = useState([]);
  const [routeInput, setRouteInput] = useState('');
  const [updatedList, setUpdatedList] = useLocalStorageState('updatedList', { defaultValue: '' });

  const user = JSON.parse(localStorage.getItem("user")) || null;
  const isKR = user?.userType?.toLowerCase().includes("kr");
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Wait 250ms before starting drag
        tolerance: 5, // Allow small movements before drag triggers
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const filteredOptions = dataArray.filter(option =>
    option.toLowerCase().includes(routeInput.toLowerCase())
  );

  const fetchRouteData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${url}/coa/recent-ledgers`, {
        params: {
          route
        }
      });

      const formattedData = response.data.map((item, index) => ({
        id: String(item.id),
        text: item.URDUNAME,
        rno: index + 1,
        originalData: item,
      }));
      setItems(formattedData);

      console.log("route", route, formattedData)
    } catch (err) {
      console.error("Error fetching route data:", err);
      setError("Failed to load customer route data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const getRoutes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`${url}/coa/routes`);
        // dataArray =
        const { kr, sr } = response.data;

        const arr = isKR ? kr : sr;
        setDataArray(arr)
      } catch (err) {
        console.error("Error fetching route data:", err);
        setError("Failed to load customer route data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    getRoutes()
  }, [])

const handleDragEnd = (event) => {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    setItems((currentItems) => {
      const oldIndex = currentItems.findIndex((item) => item.id === active.id);
      const newIndex = currentItems.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return currentItems;

      // Move the item
      const updatedItems = [...currentItems];
      const [movedItem] = updatedItems.splice(oldIndex, 1);
      updatedItems.splice(newIndex, 0, movedItem);

      // Reassign rno based on new order
      const reindexedItems = updatedItems.map((item, index) => ({
        ...item,
        rno: index + 1,
      }));
      setUpdatedList(reindexedItems);

      return reindexedItems;
    });
  }
};

  const handlePost = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.put(`${url}/coa/update-ledgers`, {
        list: updatedList,
      });
      alert(response.data.message)
    } catch (err) {
      console.error("Error fetching route data:", err);
      setError("Failed to load customer route data. Please try again later.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div style={pageStyles}>
      <div style={containerStyles}>
        <div style={headerStyles}>
          <h1 style={{ margin: 0, textAlign: "center" }}>Customer Route Order</h1>
        </div>

        <Box
          sx={{
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <FormControl sx={{ minWidth: 200 }}>
            <Autocomplete
              disablePortal
              freeSolo
              options={filteredOptions || []}
              value={route}
              inputValue={routeInput}
              onInputChange={(event, newInputValue) => {
                setRouteInput(newInputValue); // Important to update input state
              }}
              onChange={(event, newValue) => {
                setRoute(newValue); // Sets the selected value
              }}
              renderInput={(params) => (
                <TextField {...params} label={isKR ? 'KR' : 'SR'} />
              )}
            />
          </FormControl>

          <Box sx={{ minWidth: 150, height: "100%" }}>
            <Button variant="contained" height={"100%"}
              sx={{ fontSize: "1.2rem", fontWeight: "Bold" }}
              fullWidth onClick={fetchRouteData}>
              GET
            </Button>
          </Box>

        </Box>


        {loading && <p>Loading...</p>}

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableItem key={item.id} id={item.id} rno={item.rno} itemText={item.text} />
            ))}
          </SortableContext>
        </DndContext>
        <Button
          fullWidth
          disabled={loading}
          variant="contained"
          onClick={handlePost}
          sx={{ mt: 2, fontSize: "1.5rem", fontWeight: "Bold" }}
        >
          UPDATE
        </Button>
      </div>

    </div>
  );
};

export default CustomerRouteList;
