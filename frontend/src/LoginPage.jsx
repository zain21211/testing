import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { io } from "socket.io-client";
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
import { offlineService } from "./services/offlineService";

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
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ImageIcon from '@mui/icons-material/Image';
import BookIcon from '@mui/icons-material/Book';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { ALL_DASHBOARD_CARDS, FALLBACK_VISIBILITY } from './dashboardConfig';


const url = import.meta.env.VITE_API_URL;

const ActionCard = ({ title, subtitle, icon: Icon, color, path, onClick, value }) => {
  const navigate = useNavigate();
  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: { xs: '12px', md: '24px' },
        background: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        border: `2px solid ${color}20`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
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
          flex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6%',
          p: '4%',
        }}
      >
        <Icon sx={{
          fontSize: 'clamp(24px, 8vw, 60px)',
          color: color,
          display: 'block',
          lineHeight: 1,
          filter: `drop-shadow(0 2px 8px ${color}50)`,
        }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            fontWeight="900"
            sx={{
              color: '#222',
              fontSize: 'clamp(0.6rem, 3.5vw, 1.1rem)',
              lineHeight: 1.2,
              textAlign: 'center',
              fontWeight: 900,
            }}
          >
            {title}
          </Typography>
          {value !== undefined && value !== null && (
            <Typography
              sx={{
                color: color,
                fontSize: 'clamp(0.7rem, 3.8vw, 1.1rem)',
                fontWeight: '900',
                mt: 0.5,
                background: `${color}15`,
                px: 1,
                py: 0.2,
                borderRadius: '8px',
                border: `1px solid ${color}30`
              }}
            >
              Rs. {(!isNaN(Number(value)) ? Number(value).toLocaleString() : '0')}
            </Typography>
          )}
        </Box>
      </CardActionArea>
    </Card>
  );
};

const Login = () => {
  const getInitialAuthState = () => {
    try {
      const token = localStorage.getItem("authToken");
      const user = localStorage.getItem("user");
      if (token && user) {
        const decoded = jwtDecode(token);
        const isValid = !decoded.exp || (decoded.exp * 1000 > Date.now());
        if (isValid) {
          return { isLoggedIn: true, userData: JSON.parse(user) };
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
      localStorage.clear();
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
  const [visibilityConfig, setVisibilityConfig] = useState(() => {
    try {
      const cached = localStorage.getItem(`visibilityConfig_${userData?.username}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [todayRecovery, setTodayRecovery] = useState(() => {
    try { return offlineService.getCachedDashboardTotals()?.todayRecovery ?? null; } catch { return null; }
  });
  const [todaySales, setTodaySales] = useState(() => {
    try { return offlineService.getCachedDashboardTotals()?.todaySales ?? null; } catch { return null; }
  });
  const [todayPendingOrders, setTodayPendingOrders] = useState(() => {
    try { return offlineService.getCachedDashboardTotals()?.todayPendingOrders ?? null; } catch { return null; }
  });
  const [lastUsername, setLastUsername] = useState("");

  const userType = userData?.userType?.toLowerCase() || "";
  const isAdmin = userType.includes('admin');

  // Load last username for offline login hint
  useEffect(() => {
    offlineService.getLastUsername().then(u => { if (u) setLastUsername(u); });
  }, []);

  useEffect(() => {
    if (userData?.username) {
      try {
        const cached = localStorage.getItem(`visibilityConfig_${userData.username}`);
        if (cached) {
          setVisibilityConfig(JSON.parse(cached));
        }
      } catch (e) {
        console.error("Cache load error:", e);
      }
    }
  }, [userData?.username]);

  useEffect(() => {
    if (!isLoggedIn) return;
    axios.get(`${url}/form-visibility`)
      .then(res => {
        if (Array.isArray(res.data)) {
          const map = {};
          res.data.forEach(({ usertype, form_key, is_visible, sort_order }) => {
            map[`${usertype}|${form_key}`] = { isVisible: !!is_visible, sortOrder: sort_order };
          });
          setVisibilityConfig(map);
          localStorage.setItem(`visibilityConfig_${userData?.username}`, JSON.stringify(map));
        }
      })
      .catch(() => {});

    if (isAdmin) {
      const fetchTotals = () => {
        axios.get(`${url}/cash-entry/today-total`)
          .then(res => {
            const val = res.data?.total ?? 0;
            setTodayRecovery(val);
            offlineService.saveDashboardTotals({ todayRecovery: val, todaySales, todayPendingOrders });
          })
          .catch(err => console.error("Error fetching today recovery:", err));

        axios.get(`${url}/invoices/today-total-sales`)
          .then(res => {
            const val = res.data?.total ?? 0;
            setTodaySales(val);
            offlineService.saveDashboardTotals({ todayRecovery, todaySales: val, todayPendingOrders });
          })
          .catch(err => console.error("Error fetching today sales:", err));

        axios.get(`${url}/create-order/today-total-pending`)
          .then(res => {
            const val = res.data?.total ?? 0;
            setTodayPendingOrders(val);
            offlineService.saveDashboardTotals({ todayRecovery, todaySales, todayPendingOrders: val });
          })
          .catch(err => console.error("Error fetching today pending orders:", err));
      };

      fetchTotals();
      const intervalId = setInterval(fetchTotals, 5000);
      return () => clearInterval(intervalId);
    }
  }, [isLoggedIn, isAdmin]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) return;
    const socketUrl = url.endsWith('/api') ? url.replace('/api', '') : url;
    const socket = io(socketUrl);
    socket.on("recoveryUpdated", (data) => setTodayRecovery(data.total));
    socket.on("salesUpdated", (data) => setTodaySales(data.total));
    socket.on("pendingOrdersUpdated", (data) => setTodayPendingOrders(data.total));
    return () => socket.disconnect();
  }, [isLoggedIn, isAdmin]);

  const canSee = (formKey) => {
    const baseType = userType.split('-')[0];
    if (userType === "admin" && formKey === "visibility") return true;
    if (visibilityConfig) {
      const config = visibilityConfig[`${baseType}|${formKey}`];
      if (config && typeof config === 'object') return config.isVisible;
      if (config === true || config === false) return config;
    }
    return FALLBACK_VISIBILITY[formKey]?.includes(baseType) ?? false;
  };

  const getSortOrder = (formKey) => {
    const baseType = userType.split('-')[0];
    if (visibilityConfig) {
      const config = visibilityConfig[`${baseType}|${formKey}`];
      return (config && typeof config === 'object') ? config.sortOrder : 999;
    }
    return 999;
  };

  const [tempImage, setTempImage] = useState(null);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const cropperRef = React.useRef(null);

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

    // Try online login with a short timeout so tunnel/server failures fail fast
    try {
      const res = await axios.post(`${url}/login`, { password, checked }, { timeout: 5000 });
      const token = res.data.token;
      const decoded = jwtDecode(token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(decoded));
      // Save offline backup — these keys are intentionally NOT cleared on logout
      localStorage.setItem("_offlineToken", token);
      localStorage.setItem("_offlineUser", JSON.stringify(decoded));
      await offlineService.saveCredentials(decoded.username, password);
      setUserData(decoded);
      setIsLoggedIn(true);
      setPassword("");
      return; // success — done
    } catch (err) {
      // Treat any network / timeout / no-response error as "offline"
      const isNetworkError = !err.response ||
        err.code === 'ECONNABORTED' ||
        err.code === 'ERR_NETWORK' ||
        err.message?.toLowerCase().includes('network') ||
        err.message?.toLowerCase().includes('timeout');

      if (isNetworkError) {
        // Attempt offline login using locally cached credentials
        try {
          const lastUser = await localforage
            .createInstance({ name: "offlineDB", storeName: "auth" })
            .getItem("lastUser");

          if (lastUser) {
            const isValid = await offlineService.verifyCredentials(lastUser.username, password);
            if (isValid) {
              const backupUser  = localStorage.getItem("_offlineUser");
              const backupToken = localStorage.getItem("_offlineToken");
              if (backupUser && backupToken) {
                // Restore active keys so the rest of the app works
                localStorage.setItem("authToken", backupToken);
                localStorage.setItem("user", backupUser);
                setIsLoggedIn(true);
                setUserData(JSON.parse(backupUser));
                setPassword("");
                return;
              }
            }
          }
          // Credentials don't match or no backup found
          setError("Offline login failed — wrong password or no cached session. Please sign in online first.");
        } catch (offlineErr) {
          setError("Offline login failed. Please connect to the internet and try again.");
        }
        setPassword("");
      } else {
        // Server responded with an actual error (e.g. wrong password online)
        setError(err.response?.data?.message || "Login failed");
        setPassword("");
      }
    } finally {
      setIsLoading(false);
    }
  };


  const handleLogout = () => {
    // Preserve offline backup keys (_offlineToken, _offlineUser) so offline re-login works
    const offlineToken = localStorage.getItem("_offlineToken");
    const offlineUser = localStorage.getItem("_offlineUser");
    localStorage.clear();
    if (offlineToken) localStorage.setItem("_offlineToken", offlineToken);
    if (offlineUser) localStorage.setItem("_offlineUser", offlineUser);
    setIsLoggedIn(false);
    setUserData(null);
    setIsCustomer(false);
    setAvatar(null);
    navigate("/");
  };

  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    setAvatar(null);
    if (userData?.username) {
      avatarStore.getItem(`avatar_${userData.username}`).then((saved) => {
        if (saved) setAvatar(saved);
      });
    }
  }, [userData?.username]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      const preCompressed = await imageCompression(file, { maxWidthOrHeight: 800, maxSizeMB: 0.5, useWebWorker: true, fileType: "image/jpeg" });
      const objectUrl = URL.createObjectURL(preCompressed);
      setTempImage(objectUrl);
      setIsCropOpen(true);
    } catch (err) {
      const objectUrl = URL.createObjectURL(file);
      setTempImage(objectUrl);
      setIsCropOpen(true);
    }
  };

  const handleCrop = async () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas = cropper.getCroppedCanvas({ width: 400, height: 400 });
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        const compressed = await imageCompression(blob, { maxSizeMB: 0.08, maxWidthOrHeight: 400, useWebWorker: true, fileType: "image/jpeg" });
        const reader = new FileReader();
        reader.readAsDataURL(compressed);
        reader.onloadend = async () => {
          const base64data = reader.result;
          await avatarStore.setItem(`avatar_${userData.username}`, base64data);
          setAvatar(base64data);
          setIsCropOpen(false);
          URL.revokeObjectURL(tempImage);
          setTempImage(null);
          window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { username: userData.username } }));
        };
      } catch (err) {
        const fallback = canvas.toDataURL("image/jpeg", 0.5);
        await avatarStore.setItem(`avatar_${userData.username}`, fallback);
        setAvatar(fallback);
        setIsCropOpen(false);
        URL.revokeObjectURL(tempImage);
        setTempImage(null);
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: { username: userData.username } }));
      }
    }, "image/jpeg", 0.8);
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: isLoggedIn ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pt: isLoggedIn ? { xs: 0.5, md: 1 } : 4,
      pb: 4,
      px: { xs: 0, sm: 2 },
      display: 'flex',
      alignItems: isLoggedIn ? 'flex-start' : 'center',
      justifyContent: 'center'
    }}>
      {isLoggedIn ? (
        <Container maxWidth="xl" sx={{ px: { xs: 0.5, sm: 2 }, width: '100%' }}>
          <Box sx={{ mb: { xs: 1, md: 2 }, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: { xs: 1, md: 3 }, textAlign: 'left' }}>
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <input type="file" accept="image/*" capture="user" id="avatar-upload" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <label htmlFor="avatar-upload">
                <Avatar src={avatar} sx={{ width: { xs: 50, sm: 70, md: 80 }, height: { xs: 50, sm: 70, md: 80 }, bgcolor: 'primary.main', fontSize: { xs: '1.5rem', md: '2.5rem' }, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', cursor: 'pointer', '&:hover': { opacity: 0.8 } }}>
                  {!avatar && (userData?.username?.charAt(0).toUpperCase() || <PersonIcon />)}
                </Avatar>
              </label>
            </Box>
            <Box>
              <Typography variant="h2" fontWeight="900" sx={{ color: '#1a1a1a', mb: { xs: 0, md: 0.5 }, fontSize: { xs: '1.2rem', sm: '1.4rem', md: '2rem' }, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                Welcome back, {userData?.username || "Admin"}
              </Typography>
              <Typography variant="h5" sx={{ color: '#555', fontWeight: 500, fontSize: { xs: '0.85rem', sm: '0.9rem', md: '1.1rem' } }}>
                What would you like to manage today?
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(4, 1fr)', md: 'repeat(6, 1fr)' }, gridAutoRows: '1fr', gap: { xs: '4px', sm: '8px', md: '12px' }, width: '100%' }}>
            {ALL_DASHBOARD_CARDS
              .filter(card => (card.adminOnly ? userType === "admin" : canSee(card.key)))
              .sort((a, b) => getSortOrder(a.key) - getSortOrder(b.key))
              .map(card => {
                let value = null;
                if (isAdmin) {
                  if (card.dynamicValue === "todayRecovery") value = todayRecovery;
                  if (card.dynamicValue === "todaySales") value = todaySales;
                  if (card.dynamicValue === "todayPendingOrders") value = todayPendingOrders;
                }
                return <ActionCard key={card.key} title={card.title} subtitle={card.subtitle} icon={card.icon} color={card.color} path={card.path} value={value} />;
              })}
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: { xs: 4, md: 8 }, mb: 2 }}>
            <IconButton onClick={handleLogout} sx={{ width: 56, height: 56, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#d32f2f', transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)', '&:hover': { bgcolor: '#d32f2f', color: 'white', transform: 'rotate(180deg) scale(1.1)', boxShadow: '0 0 25px rgba(211, 47, 47, 0.4)' }, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
              <LogoutIcon sx={{ fontSize: 24 }} />
            </IconButton>
            <Typography variant="caption" sx={{ mt: 1.5, fontWeight: 700, color: '#999', letterSpacing: '3px', textTransform: 'uppercase', fontSize: '0.6rem' }}>End Session</Typography>
          </Box>
        </Container>
      ) : (
        <Paper elevation={24} sx={{ p: { xs: 2.5, md: 3 }, width: '100%', maxWidth: 450, borderRadius: '32px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" fontWeight="900" sx={{ color: '#1a1a1a', letterSpacing: '-1px' }}>Welcome back.</Typography>
            <Typography variant="body1" sx={{ color: '#666' }}>Enter your password to access the system.</Typography>
          </Box>
          <Box component="form" onSubmit={handleLogin}>
            {lastUsername && (
              <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(25, 118, 210, 0.06)', border: '1px solid rgba(25,118,210,0.2)' }}>
                <Typography variant="body2" sx={{ color: '#555', fontWeight: 600 }}>
                  👤 Last signed in as: <strong>{lastUsername}</strong>
                </Typography>
              </Box>
            )}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="600" sx={{ mb: 1, ml: 1 }}>Password</Typography>
              <OutlinedInput type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required sx={{ borderRadius: '16px', bgcolor: 'white' }} startAdornment={<InputAdornment position="start"><LockOutlinedIcon color="action" /></InputAdornment>} endAdornment={<InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>} />
            </FormControl>
            <FormControlLabel control={<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />} label="Keep me signed in" sx={{ mb: 4, ml: 0.5 }} />
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}
            <Button type="submit" fullWidth variant="contained" disabled={isLoading} sx={{ py: 2, borderRadius: '16px', fontSize: '1.1rem', fontWeight: 700, textTransform: 'none', boxShadow: '0 10px 20px -10px #1976d2' }}>{isLoading ? <CircularProgress size={24} color="inherit" /> : "Sign In"}</Button>
          </Box>
        </Paper>
      )}
      <Dialog open={isCropOpen} onClose={() => setIsCropOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Adjust Profile Picture</DialogTitle>
        <DialogContent dividers>{tempImage && <Box sx={{ width: '100%', height: 400, bgcolor: '#000' }}><Cropper src={tempImage} style={{ height: 400, width: "100%" }} initialAspectRatio={1} aspectRatio={1} guides={true} ref={cropperRef} viewMode={1} dragMode="move" autoCropArea={1} background={false} responsive={true} checkOrientation={true} /></Box>}</DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setIsCropOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button><Button onClick={handleCrop} variant="contained" color="primary" sx={{ borderRadius: '12px', px: 4, fontWeight: 700 }}>Save Picture</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;