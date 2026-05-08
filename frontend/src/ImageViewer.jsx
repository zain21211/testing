import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
} from "@mui/material";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

const url = import.meta.env.VITE_API_URL;

const ImageViewer = () => {
  const [type, setType] = useState("Sale");
  const [doc, setDoc] = useState("");
  const [image, setImage] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [initialRotation, setInitialRotation] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const navigate = useNavigate();

  const fetchImage = async () => {
    if (!doc) {
      setError("Please enter a document number");
      return;
    }
    setLoading(true);
    setError(null);
    setImage(null);
    setCustomerName("");
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.get(`${url}/image-viewer/get-image`, {
        params: { type, doc },
        headers: { Authorization: `Bearer ${token}` },
      });
      setImage(res.data.image);
      setCustomerName(res.data.customerName);
      setRotation(res.data.orientation || 0);
      setInitialRotation(res.data.orientation || 0);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch image");
    } finally {
      setLoading(false);
    }
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const saveOrientation = async () => {
    if (rotation === initialRotation) return;
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `${url}/image-viewer/update-orientation`,
        { type, doc, orientation: rotation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Orientation saved");
    } catch (err) {
      console.error("Failed to save orientation:", err);
    }
  };

  const handleMaximize = () => {
    setIsMaximized(true);
    // Request browser-level fullscreen to hide address bar
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { /* Safari */
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE11 */
      elem.msRequestFullscreen();
    }
  };

  const handleCloseMaximized = () => {
    setIsMaximized(false);
    // Exit browser-level fullscreen
    if (document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [lastTouch, setLastTouch] = useState({ dist: 0, x: 0, y: 0 });

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
      const midX = (touch1.pageX + touch2.pageX) / 2;
      const midY = (touch1.pageY + touch2.pageY) / 2;
      setLastTouch({ dist, x: midX, y: midY });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouch.dist > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const dist = Math.hypot(touch1.pageX - touch2.pageX, touch1.pageY - touch2.pageY);
      const midX = (touch1.pageX + touch2.pageX) / 2;
      const midY = (touch1.pageY + touch2.pageY) / 2;

      // Update Zoom
      const zoomDelta = dist / lastTouch.dist;
      setZoom((prev) => Math.min(Math.max(prev * zoomDelta, 1), 5));

      // Update Panning Offset
      const dx = midX - lastTouch.x;
      const dy = midY - lastTouch.y;
      setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));

      setLastTouch({ dist, x: midX, y: midY });
    }
  };

  const handleTouchEnd = () => {
    setLastTouch({ dist: 0, x: 0, y: 0 });
  };

  const resetMaximized = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    handleCloseMaximized();
  };

  useEffect(() => {
    return () => {
      if (rotation !== initialRotation && doc) {
        saveOrientation();
      }
    };
  }, [rotation, initialRotation, doc, type]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: "16px" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={() => navigate("/")} sx={{ mr: 2 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="bold">
            Image Viewer
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="Sale">Sale</MenuItem>
              <MenuItem value="CRV">CRV</MenuItem>
              <MenuItem value="BRV">BRV</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Doc #"
            type="number"
            value={doc}
            onChange={(e) => setDoc(e.target.value)}
            sx={{ flexGrow: 1 }}
          />

          <Button
            variant="contained"
            onClick={fetchImage}
            disabled={loading}
            sx={{ height: "56px", px: 4, borderRadius: "12px" }}
          >
            {loading ? <CircularProgress size={24} /> : "Show Image"}
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        {customerName && (
          <Typography
            variant="h6"
            textAlign="center"
            sx={{
              mb: 2,
              fontWeight: "bold",
              color: "primary.main",
              background: "rgba(25, 118, 210, 0.1)",
              py: 1,
              borderRadius: "8px",
            }}
          >
            {customerName}
          </Typography>
        )}

        {image && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: "500px",
                overflow: "hidden",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#f0f0f0",
                minHeight: "300px",
                cursor: "zoom-in",
              }}
              onClick={handleMaximize}
            >
              <img
                src={image}
                alt="Document"
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  transform: `rotate(${rotation}deg)`,
                  transition: "transform 0.3s ease",
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <IconButton
                onClick={handleRotateLeft}
                color="primary"
                sx={{ bgcolor: "rgba(25, 118, 210, 0.1)" }}
              >
                <RotateLeftIcon />
              </IconButton>
              <IconButton
                onClick={handleRotateRight}
                color="primary"
                sx={{ bgcolor: "rgba(25, 118, 210, 0.1)" }}
              >
                <RotateRightIcon />
              </IconButton>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Maximized View Dialog - Minimal Full Screen with Pinch Zoom */}
      <Dialog
        fullScreen
        open={isMaximized}
        onClose={resetMaximized}
        PaperProps={{
          sx: { 
            bgcolor: "black", 
            color: "white",
            overflow: "hidden" 
          },
        }}
      >
        <Box 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          sx={{ 
            height: "100vh", 
            width: "100vw", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            overflow: "hidden",
            position: "relative",
            touchAction: "none" // Disable browser defaults to handle custom pinch
          }}
        >
          {/* Close Button Overlay */}
          <Box sx={{ 
            position: "absolute", 
            top: 20, 
            right: 20, 
            zIndex: 30 
          }}>
            <IconButton 
              color="inherit" 
              onClick={resetMaximized}
              sx={{ bgcolor: "rgba(255,255,255,0.1)", "&:hover": { bgcolor: "rgba(255,255,255,0.2)" } }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Box 
            onClick={(e) => {
              if (e.detail === 1) resetMaximized();
            }}
            sx={{
              transition: "transform 0.1s ease-out",
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              display: "inline-block",
              cursor: "move",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <img 
              src={image} 
              alt="Maximized" 
              style={{ 
                maxWidth: "100vw", 
                maxHeight: "100vh",
                objectFit: "contain",
                pointerEvents: "none"
              }} 
            />
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default ImageViewer;
