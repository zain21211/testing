import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  Container, Typography, Box, TextField, Button, Paper, CircularProgress,
  Alert, IconButton, InputAdornment, FormControl, OutlinedInput, Checkbox,
  FormControlLabel, Grid, Avatar, Card, CardContent, CardActionArea, useTheme,
  Dialog, DialogTitle, DialogContent, DialogActions
} from "@mui/material";

import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import imageCompression from "browser-image-compression";
import localforage from "localforage";

const avatarStore = localforage.createInstance({ name: "avatarDB" });

// Icons
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import HistoryIcon from '@mui/icons-material/History';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import RouteIcon from '@mui/icons-material/Route';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';

const paymentVoucher = ['admin', 'payment'];
const packingList = ['pack', 'admin', 'operator'];
const forSpo = ['spo', 'admin', 'operator'];
const userTypes_list = ["sm", 'admin'];

const url = import.meta.env.VITE_API_URL;

// --- Sub-component: Action Card ---
const ActionCard = ({ title, subtitle, icon: Icon, color, path, onClick }) => {
  const navigate = useNavigate();
  return (
    <Card 
      sx={{ 
        aspectRatio: '1 / 1',
        width: '100%',
        borderRadius: { xs: '12px', md: '24px' },
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: `2px solid ${color}20`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
        '&:hover': {
          transform: 'scale(1.05)',
          boxShadow: `0 12px 32px -8px ${color}60`,
          borderColor: color,
          background: `${color}08`,
        }
      }}
    >
      <CardActionArea 
        onClick={() => path ? navigate(path) : onClick()}
        sx={{ 
          width: '100%',
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6%',
          p: '4%',
        }}
      >
        {/* 
          Card width = 1/3 of screen ≈ 33vw.
          We want icon to fill ~65% of card = ~22vw.
          clamp(40px, 22vw, 180px) covers mobile → desktop.
        */}
        <Icon sx={{ 
          fontSize: 'clamp(32px, 16vw, 140px)',
          color: color,
          display: 'block',
          lineHeight: 1,
          filter: `drop-shadow(0 2px 8px ${color}50)`,
        }} />
        <Typography 
          fontWeight="900" 
          sx={{ 
            color: '#222', 
            fontSize: 'clamp(0.6rem, 3.5vw, 1.1rem)',
            lineHeight: 1,
            textAlign: 'center',
            fontWeight: 900,
          }}
        >
          {title}
        </Typography>
      </CardActionArea>
    </Card>
  );
};


const Login = () => {
  // Helper to get initial state - strictly checking localStorage
  const getInitialAuthState = () => {
    try {
      const token = localStorage.getItem("authToken");
      const user = localStorage.getItem("user");
      if (token && user) {
        const decoded = jwtDecode(token);
        // If no exp exists, assume it's a permanent token; otherwise check against now
        const isValid = !decoded.exp || (decoded.exp * 1000 > Date.now());
        if (isValid) {
          return { isLoggedIn: true, userData: JSON.parse(user) };
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
      localStorage.clear(); // Clear potentially corrupt data
    }
    return { isLoggedIn: false, userData: null };
  };

  const [initialAuth] = useState(getInitialAuthState());
  const [isLoggedIn, setIsLoggedIn] = useState(initialAuth.isLoggedIn);
  const [userData, setUserData] = useState(initialAuth.userData);
  
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(true);
  const [isCustomer, setIsCustomer] = useState(false);

  // Crop State
  const [tempImage, setTempImage] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const cropperRef = React.useRef(null);

  // Sync state if localStorage changes (optional but good for multi-tab)
  useEffect(() => {
    const auth = getInitialAuthState();
    if (auth.isLoggedIn !== isLoggedIn) {
      setIsLoggedIn(auth.isLoggedIn);
      setUserData(auth.userData);
    }
  }, []);

  // Still keep this for customer/SPO redirection
  useEffect(() => {
    if (userData?.userType) {
      const isCust = userData.userType.toLowerCase().includes("cust");
      setIsCustomer(isCust);
      if (isLoggedIn) {
        if (isCust) navigate("/order");
        else if (userData.userType.toLowerCase().includes("spo")) navigate("/turnoverreport");
      }
    }
  }, [userData, isLoggedIn, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await axios.post(`${url}/login`, { password, checked });
      const token = res.data.token;
      const user = jwtDecode(token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));
      setUserData(user);
      setIsLoggedIn(true);
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUserData(null);
    setIsCustomer(false);
    setAvatar(null);   // clear avatar so previous user's pic never shows
    navigate("/");
  };

  const [avatar, setAvatar] = useState(null);

  // Load avatar from IndexedDB whenever the logged-in user changes.
  // Always reset to null first so a previous user's image never persists.
  useEffect(() => {
    setAvatar(null);
    if (userData?.username) {
      avatarStore.getItem(`avatar_${userData.username}`).then((saved) => {
        if (saved) setAvatar(saved);
      });
    }
  }, [userData?.username]); // key on username, not the whole object

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";

    try {
      // PRE-COMPRESS before the cropper ever touches it.
      // A 12MP camera photo needs ~48MB RAM as a canvas. Downscale it first.
      const preCompressed = await imageCompression(file, {
        maxWidthOrHeight: 800,   // cropper never needs more than this
        maxSizeMB: 0.5,
        useWebWorker: true,
        fileType: "image/jpeg",
      });
      const objectUrl = URL.createObjectURL(preCompressed);
      setTempImage(objectUrl);
      setIsCropOpen(true);
    } catch (err) {
      console.error("Pre-compression failed:", err);
      // Fallback: try loading directly (may still crash on very low-memory devices)
      const objectUrl = URL.createObjectURL(file);
      setTempImage(objectUrl);
      setIsCropOpen(true);
    }
  };

  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // Get a small cropped canvas (400x400 is plenty for an avatar)
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        // Compress the already-small cropped blob
        const compressed = await imageCompression(blob, {
          maxSizeMB: 0.08,          // ~80 KB target
          maxWidthOrHeight: 400,
          useWebWorker: true,
          fileType: "image/jpeg",
        });

        const reader = new FileReader();
        reader.readAsDataURL(compressed);
        reader.onloadend = async () => {
          const base64data = reader.result;
          // Save to IndexedDB — no 5 MB localStorage limit
          await avatarStore.setItem(`avatar_${userData.username}`, base64data);
          // Remove old copy from localStorage if any
          localStorage.removeItem(`avatar_${userData.username}`);
          setAvatar(base64data);
          setIsCropOpen(false);
          // Release the Object URL now that we're done
          URL.revokeObjectURL(tempImage);
          setTempImage(null);
        };
      } catch (err) {
        console.error("Crop/compress error:", err);
        // Fallback: low-quality inline jpeg
        const fallback = canvas.toDataURL("image/jpeg", 0.5);
        await avatarStore.setItem(`avatar_${userData.username}`, fallback);
        localStorage.removeItem(`avatar_${userData.username}`);
        setAvatar(fallback);
        setIsCropOpen(false);
        URL.revokeObjectURL(tempImage);
        setTempImage(null);
      }
    }, "image/jpeg", 0.8);
  };

  const userType = userData?.userType?.toLowerCase() || "";
  const isBilty = userType.includes("bilty");

  if (isLoggedIn && (isCustomer || userType.includes("spo"))) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: isLoggedIn 
        ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pt: isLoggedIn ? { xs: 0.5, md: 1 } : 4,
      pb: 4,
      px: { xs: 0, sm: 2 }, 
      display: 'flex',
      alignItems: isLoggedIn ? 'flex-start' : 'center',
      justifyContent: 'center'
    }}>
      {isLoggedIn ? (
        <Container maxWidth="xl" sx={{ px: { xs: 0.5, sm: 4 }, width: '100%' }}>
          <Box sx={{ 
            mb: { xs: 2, md: 4 }, 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: { xs: 2, md: 6 },
            textAlign: { xs: 'center', sm: 'left' }
          }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <input
                type="file"
                accept="image/*"
                capture="user"
                id="avatar-upload"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <label htmlFor="avatar-upload">
                <Avatar 
                  src={avatar}
                  sx={{ 
                    width: { xs: 120, md: 200 }, height: { xs: 120, md: 200 }, 
                    bgcolor: 'primary.main', fontSize: '4rem',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    '&:hover': { opacity: 0.8 }
                  }}
                >
                  {!avatar && (userData?.username?.charAt(0).toUpperCase() || <PersonIcon />)}
                </Avatar>
              </label>
            </Box>
            <Box>
              <Typography 
                variant="h2" 
                fontWeight="900" 
                sx={{ 
                  color: '#1a1a1a', mb: 1,
                  fontSize: { xs: '1.75rem', md: '4rem' },
                  letterSpacing: '-1px',
                  lineHeight: 1.1
                }}
              >
                Welcome back, {userData?.username || "Admin"}
              </Typography>
              <Typography variant="h5" sx={{ color: '#555', fontWeight: 500, fontSize: { xs: '1rem', md: '1.5rem' } }}>
                What would you like to manage today?
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: { xs: '6px', sm: '12px', md: '20px' },
              width: '100%',
            }}
          >
            {!isBilty && packingList.some(e => userType.includes(e)) && (
              <>
                <ActionCard 
                  title="Packing" subtitle="Pending"
                  icon={InventoryIcon} color="#ff3d07" path="/pending" 
                />
                <ActionCard 
                  title="Load" subtitle="Shipping"
                  icon={LocalShippingIcon} color="#00a611" path="/load" 
                />
              </>
            )}

            {!isBilty && (forSpo.includes(userType) || userData?.username.includes("ZAIN")) && (
              <ActionCard 
                title="SPO" subtitle="Working"
                icon={AssessmentIcon} color="#FFC107" path="/turnoverreport" 
              />
            )}

            {!isBilty && (paymentVoucher.includes(userType) || userData?.username.includes("ZAIN")) && (
              <>
                <ActionCard 
                  title="Payment" subtitle="Voucher"
                  icon={AccountBalanceWalletIcon} color="#795548" path="/paymentvoucher" 
                />
                <ActionCard 
                  title="History" subtitle="Sales"
                  icon={HistoryIcon} color="#009688" path="/saleshistory" 
                />
              </>
            )}

            {!isBilty && userType !== 'payment' && !userType.includes('pack') && (
              <>
                <ActionCard 
                  title="Accounts" subtitle="COA"
                  icon={PeopleAltIcon} color="#610051" path="/coa" 
                />
                <ActionCard 
                  title="Recovery" subtitle="Dues"
                  icon={ReceiptLongIcon} color="#2e7d32" path="/recovery" 
                />
                <ActionCard 
                  title="Sales" subtitle="Daily"
                  icon={TrendingUpIcon} color="#009688" path="/sales" 
                />
                <ActionCard 
                  title="New Order" subtitle="Invoice"
                  icon={AddShoppingCartIcon} color="#1976d2" path="/order" 
                />
              </>
            )}

            {userTypes_list.some(type => userType.includes(type)) || isBilty ? (
              <>
                {!isBilty && (
                  <>
                    <ActionCard 
                      title="Products" subtitle="Stock"
                      icon={ShoppingBagIcon} color="#ff00ea" path="/productslist" 
                    />
                    <ActionCard 
                      title="Routes" subtitle="Mapping"
                      icon={RouteIcon} color="#3f51b5" path="/list" 
                    />
                  </>
                )}
                <ActionCard 
                  title="Delivery" subtitle="Tracking"
                  icon={DeliveryDiningIcon} color="#a41260" path="/delivery" 
                />
              </>
            ) : null}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            mt: { xs: 4, md: 8 },
            mb: 2
          }}>
            <IconButton
              onClick={handleLogout}
              sx={{ 
                width: 56, 
                height: 56, 
                bgcolor: 'rgba(211, 47, 47, 0.1)',
                color: '#d32f2f',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { 
                  bgcolor: '#d32f2f',
                  color: 'white',
                  transform: 'rotate(180deg) scale(1.1)',
                  boxShadow: '0 0 25px rgba(211, 47, 47, 0.4)'
                },
                boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
              }}
            >
              <LogoutIcon sx={{ fontSize: 24 }} />
            </IconButton>
            <Typography 
              variant="caption" 
              sx={{ 
                mt: 1.5, 
                fontWeight: 700, 
                color: '#999', 
                letterSpacing: '3px', 
                textTransform: 'uppercase',
                fontSize: '0.6rem'
              }}
            >
              End Session
            </Typography>
          </Box>
        </Container>
      ) : (
        <Paper 
          elevation={24} 
          sx={{ 
            p: { xs: 2.5, md: 3 }, width: '100%', maxWidth: 450, borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight="900" sx={{ color: '#1a1a1a', letterSpacing: '-1px' }}>
              Welcome back.
            </Typography>
            <Typography variant="body1" sx={{ color: '#666' }}>
              Enter your password to access the system.
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleLogin}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" sx={{ mb: 1, ml: 1 }}>Password</Typography>
              <OutlinedInput
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                sx={{ borderRadius: '16px', bgcolor: 'white' }}
                startAdornment={<InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment>}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>

            <FormControlLabel 
              control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />} 
              label="Keep me signed in"
              sx={{ mb: 4, ml: 0.5 }}
            />

            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={isLoading}
              sx={{ 
                py: 2, borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700,
                textTransform: 'none', boxShadow: '0 10px 20px -10px #1976d2'
              }}
            >
              {isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Cropper Dialog */}
      <Dialog open={isCropOpen} onClose={() => setIsCropOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adjust Profile Picture</DialogTitle>
        <DialogContent dividers>
          {tempImage && (
            <Box sx={{ width: '100%', height: 400, bgcolor: '#000' }}>
              <Cropper
                src={tempImage}
                style={{ height: 400, width: "100%" }}
                initialAspectRatio={1}
                aspectRatio={1}
                guides={true}
                ref={cropperRef}
                viewMode={1}
                dragMode="move"
                autoCropArea={1}
                background={false}
                responsive={true}
                checkOrientation={true}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCropOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleCrop} variant="contained" color="primary" sx={{ borderRadius: '12px', px: 4, fontWeight: 700 }}>
            Save Picture
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;