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
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
} from "@mui/material";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PersonIcon from "@mui/icons-material/Person";
import { useNavigate, useSearchParams } from "react-router-dom";

const url = import.meta.env.VITE_API_URL;

const ImageViewer = () => {
  const [type, setType] = useState("Sale");
  const [doc, setDoc] = useState("");
  const [image, setImage] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [initialRotation, setInitialRotation] = useState(0);
  const [isMaximized, setIsMaximized] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  // Get user info for admin check
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isAdmin = user.userType?.toLowerCase() === "admin";

  const [receiptStatus, setReceiptStatus] = useState(null);
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchImage = async () => {
    if (!doc) {
      setError("Please enter a document number");
      return;
    }
    setLoading(true);
    setError(null);
    setImage(null);
    setCustomerName("");
    setMetadata(null);
    setReceiptStatus(null);
    setLedgerAmount("");
    
    try {
      const token = localStorage.getItem("authToken");
      
      // 1. Fetch Image and Customer Details first to get the ACID
      const imageRes = await axios.get(`${url}/image-viewer/get-image`, {
        params: { type, doc },
        headers: { Authorization: `Bearer ${token}` },
      });

      setImage(imageRes.data.image);
      setCustomerName(imageRes.data.customerName);
      setMetadata(imageRes.data.metadata);
      setRotation(imageRes.data.orientation || 0);
      setInitialRotation(imageRes.data.orientation || 0);

      // 2. Fetch Ledger Details using the retrieved ACID
      if (imageRes.data.acid) {
        const ledgerRes = await axios.get(`${url}/image-viewer/get-ledger-details`, {
          params: { type, doc, acid: imageRes.data.acid },
          headers: { Authorization: `Bearer ${token}` },
        }).catch(err => ({ data: { Amount: 0, ReceiptStatus: "N/A" } }));

        if (ledgerRes.data) {
          setLedgerAmount(ledgerRes.data.Amount);
          setReceiptStatus(ledgerRes.data.ReceiptStatus);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch image");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!isAdmin) {
      alert("Only admins can change the transaction status.");
      return;
    }
    if (updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const token = localStorage.getItem("authToken");
      // Find the acid from state if available
      const currentAcid = metadata?.acid || null; 
      
      const res = await axios.post(
        `${url}/image-viewer/toggle-status`,
        { type, doc, acid: currentAcid },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReceiptStatus(res.data.newStatus);
      setError(`Status updated. Narration: ${res.data.newNarration}`);
      localStorage.setItem("ledgerNeedsRefresh", "true");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `${url}/image-viewer/delete-image`,
        { type, doc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setImage(null);
      setCustomerName("");
      setMetadata(null);
      setDeleteDialogOpen(false);
      setError("Image deleted successfully.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const saveOrientation = async () => {
    if (rotation === initialRotation || !image) return;
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

  const resetMaximized = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    handleCloseMaximized();
  };

  const [searchParams] = useSearchParams();

  // Auto-fetch if params are present in URL
  useEffect(() => {
    const qType = searchParams.get("type");
    const qDoc = searchParams.get("doc");
    if (qType && qDoc) {
      setType(qType);
      setDoc(qDoc);
      // We use a small timeout to ensure state is updated before fetching
      setTimeout(() => {
        const fetchWithParams = async () => {
          setLoading(true);
          setError(null);
          try {
            const token = localStorage.getItem("authToken");
            const [imageRes, ledgerRes] = await Promise.all([
              axios.get(`${url}/image-viewer/get-image`, {
                params: { type: qType, doc: qDoc },
                headers: { Authorization: `Bearer ${token}` },
              }),
              axios.get(`${url}/image-viewer/get-ledger-details`, {
                params: { type: qType, doc: qDoc },
                headers: { Authorization: `Bearer ${token}` },
              }).catch(err => ({ data: { Amount: "N/A", ReceiptStatus: "N/A" } }))
            ]);

            setImage(imageRes.data.image);
            setCustomerName(imageRes.data.customerName);
            setMetadata(imageRes.data.metadata);
            setRotation(imageRes.data.orientation || 0);
            setInitialRotation(imageRes.data.orientation || 0);
            
            if (ledgerRes.data) {
              setLedgerAmount(ledgerRes.data.Amount);
              setReceiptStatus(ledgerRes.data.ReceiptStatus);
            }
          } catch (err) {
            setError(err.response?.data?.error || "Failed to fetch image");
          } finally {
            setLoading(false);
          }
        };
        fetchWithParams();
      }, 100);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (rotation !== initialRotation && doc && image) {
        saveOrientation();
      }
    };
  }, [rotation, initialRotation, doc, type, image]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: "20px", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)" }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ mr: 2, bgcolor: "rgba(0,0,0,0.05)" }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight="900" color="primary">
            Document Image Vault
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
              sx={{ borderRadius: "12px" }}
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
            sx={{ flexGrow: 1, "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
          />

          <Button
            variant="contained"
            onClick={fetchImage}
            disabled={loading}
            sx={{ 
              height: "56px", 
              px: 4, 
              borderRadius: "12px", 
              fontWeight: "bold", 
              minWidth: "180px",
              boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)" 
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Retrieve Image"}
          </Button>

          {image && (
            <Button
              variant="contained"
              onClick={handleToggleStatus}
              disabled={updatingStatus}
              sx={{ 
                height: "56px", 
                px: 3, 
                borderRadius: "12px", 
                fontWeight: "bold",
                minWidth: "180px",
                bgcolor: (receiptStatus === null) ? '#d32f2f' : '#2e7d32',
                '&:hover': {
                  bgcolor: (receiptStatus === null) ? '#b71c1c' : '#1b5e20',
                },
                boxShadow: "0 4px 14px 0 rgba(0,0,0,0.2)"
              }}
            >
              {updatingStatus ? <CircularProgress size={24} color="inherit" /> : 
               (receiptStatus === null ? 'Pending' : 'Verified')}
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity={error.includes("successfully") ? "success" : "error"} sx={{ mb: 2, borderRadius: "12px" }}>
            {error}
          </Alert>
        )}

        {customerName && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              textAlign="center"
              sx={{
                mb: 2,
                fontWeight: "bold",
                color: "white",
                background: "linear-gradient(90deg, #1976d2, #64b5f6)",
                py: 1.5,
                borderRadius: "12px",
                boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
              }}
            >
              {customerName}
            </Typography>

            {metadata && (
              <Paper variant="outlined" sx={{ p: 2, borderRadius: "12px", bgcolor: "rgba(0,0,0,0.02)" }}>
                {/* Line 1: Date and Time */}
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, px: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <EventIcon color="action" fontSize="small" />
                    <Typography variant="body1"><strong>Date:</strong> {metadata.date}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccessTimeIcon color="action" fontSize="small" />
                    <Typography variant="body1"><strong>Time:</strong> {metadata.time}</Typography>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 2 }} />

                {/* Line 2: Saved By and Amount */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <PersonIcon color="action" fontSize="small" />
                    <Typography variant="body1"><strong>Saved By:</strong> {metadata.savedBy}</Typography>
                  </Box>
                  
                  <TextField
                    label="Ledger Amount"
                    value={ledgerAmount ? new Intl.NumberFormat('en-US').format(ledgerAmount) : "0"}
                    variant="outlined"
                    size="small"
                    InputProps={{ 
                      readOnly: true,
                      sx: { fontWeight: "900", color: "primary.main", fontSize: "1.3rem" },
                      inputProps: { style: { textAlign: 'right' } }
                    }}
                    sx={{ 
                      width: "180px",
                      "& .MuiOutlinedInput-root": { borderRadius: "10px", bgcolor: "white" }
                    }}
                  />
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {image && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Box
              sx={{
                width: "100%",
                maxWidth: "600px",
                overflow: "hidden",
                borderRadius: "20px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: "#f8f9fa",
                minHeight: "400px",
                cursor: "zoom-in",
                border: "1px solid rgba(0,0,0,0.05)"
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
                  transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <IconButton
                onClick={handleRotateLeft}
                color="primary"
                sx={{ bgcolor: "rgba(25, 118, 210, 0.1)", p: 2 }}
              >
                <RotateLeftIcon />
              </IconButton>
              <IconButton
                onClick={handleRotateRight}
                color="primary"
                sx={{ bgcolor: "rgba(25, 118, 210, 0.1)", p: 2 }}
              >
                <RotateRightIcon />
              </IconButton>
              {isAdmin && (
                <IconButton
                  onClick={() => setDeleteDialogOpen(true)}
                  color="error"
                  sx={{ bgcolor: "rgba(211, 47, 47, 0.1)", p: 2 }}
                >
                  <DeleteForeverIcon />
                </IconButton>
              )}
            </Box>
          </Box>
        )}
      </Paper>

      {/* Maximized View Dialog */}
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
            touchAction: "none"
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{ sx: { borderRadius: "20px", p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "error.main" }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this image from the database? This action cannot be undone.
          </DialogContentText>
          <Box sx={{ mt: 2, p: 2, bgcolor: "#fff5f5", borderRadius: "12px", border: "1px solid #ffc1c1" }}>
            <Typography variant="body2" color="error"><strong>Doc:</strong> {doc} ({type})</Typography>
            <Typography variant="body2" color="error"><strong>Customer:</strong> {customerName}</Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting} sx={{ borderRadius: "10px" }}>
            Cancel
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained" 
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteForeverIcon />}
            sx={{ borderRadius: "10px", px: 3 }}
          >
            {deleting ? "Deleting..." : "Delete Permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ImageViewer;
