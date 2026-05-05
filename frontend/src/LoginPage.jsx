import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  Container, Typography, Box, TextField, Button, Paper, CircularProgress,
  Alert, IconButton, InputAdornment, FormControl, OutlinedInput, Checkbox,
  FormControlLabel, Grid, Avatar, Card, CardContent, CardActionArea, useTheme
} from "@mui/material";

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
        height: '100%',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: `0 12px 30px -10px ${color}80`,
          borderColor: color,
        }
      }}
    >
      <CardActionArea 
        onClick={() => path ? navigate(path) : onClick()}
        sx={{ height: '100%', p: 3 }}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center',
          gap: 2 
        }}>
          <Avatar sx={{ 
            bgcolor: `${color}15`, 
            color: color, 
            width: 64, 
            height: 64,
            mb: 1
          }}>
            <Icon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="700" sx={{ color: '#1a1a1a', mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" sx={{ color: '#666', lineHeight: 1.3 }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
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
    navigate("/");
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
      py: 4,
      px: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {isLoggedIn ? (
        <Container maxWidth="lg">
          <Box sx={{ mb: 6, textAlign: 'center' }}>
            <Avatar 
              sx={{ 
                width: 80, height: 80, mx: 'auto', mb: 2, 
                bgcolor: 'primary.main', fontSize: '2rem',
                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
              }}
            >
              {userData?.username?.charAt(0).toUpperCase() || <PersonIcon />}
            </Avatar>
            <Typography variant="h3" fontWeight="800" sx={{ color: '#1a1a1a', mb: 1 }}>
              Welcome back, {userData?.username || "Admin"}
            </Typography>
            <Typography variant="h6" sx={{ color: '#555', fontWeight: 400 }}>
              What would you like to manage today?
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {!isBilty && packingList.some(e => userType.includes(e)) && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Packing List" subtitle="Manage pending orders"
                    icon={InventoryIcon} color="#ff3d07" path="/pending" 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Load Form" subtitle="Track shipping & logistics"
                    icon={LocalShippingIcon} color="#00a611" path="/load" 
                  />
                </Grid>
              </>
            )}

            {!isBilty && (forSpo.includes(userType) || userData?.username.includes("ZAIN")) && (
              <Grid item xs={12} sm={6} md={3}>
                <ActionCard 
                  title="SPO Working" subtitle="Turnover & sales reports"
                  icon={AssessmentIcon} color="#FFC107" path="/turnoverreport" 
                />
              </Grid>
            )}

            {!isBilty && (paymentVoucher.includes(userType) || userData?.username.includes("ZAIN")) && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Payments" subtitle="Vouchers & transactions"
                    icon={AccountBalanceWalletIcon} color="#795548" path="/paymentvoucher" 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="History" subtitle="Detailed sales records"
                    icon={HistoryIcon} color="#009688" path="/saleshistory" 
                  />
                </Grid>
              </>
            )}

            {!isBilty && userType !== 'payment' && !userType.includes('pack') && (
              <>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Accounts" subtitle="Manage COA & customers"
                    icon={PeopleAltIcon} color="#610051" path="/coa" 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Recovery" subtitle="Pending dues & collections"
                    icon={ReceiptLongIcon} color="#2e7d32" path="/recovery" 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Sales" subtitle="Daily sales performance"
                    icon={TrendingUpIcon} color="#009688" path="/sales" 
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="New Order" subtitle="Create fresh sales invoice"
                    icon={AddShoppingCartIcon} color="#1976d2" path="/order" 
                  />
                </Grid>
              </>
            )}

            {userTypes_list.some(type => userType.includes(type)) || isBilty ? (
              <>
                {!isBilty && (
                  <>
                    <Grid item xs={12} sm={6} md={3}>
                      <ActionCard 
                        title="Products" subtitle="Inventory & stock list"
                        icon={ShoppingBagIcon} color="#ff00ea" path="/productslist" 
                      />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <ActionCard 
                        title="Routes" subtitle="Customer route mapping"
                        icon={RouteIcon} color="#3f51b5" path="/list" 
                      />
                    </Grid>
                  </>
                )}
                <Grid item xs={12} sm={6} md={3}>
                  <ActionCard 
                    title="Delivery" subtitle="Active delivery tracking"
                    icon={DeliveryDiningIcon} color="#a41260" path="/delivery" 
                  />
                </Grid>
              </>
            ) : null}

            <Grid item xs={12}>
              <Button
                fullWidth
                onClick={handleLogout}
                variant="outlined"
                startIcon={<LogoutIcon />}
                sx={{ 
                  mt: 4, py: 2, borderRadius: '16px', color: '#d32f2f', borderColor: '#d32f2f',
                  fontWeight: 700, '&:hover': { bgcolor: '#d32f2f', color: 'white', borderColor: '#d32f2f' }
                }}
              >
                Logout from System
              </Button>
            </Grid>
          </Grid>
        </Container>
      ) : (
        <Paper 
          elevation={24} 
          sx={{ 
            p: 5, width: '100%', maxWidth: 450, borderRadius: '32px',
            background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(20px)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 5 }}>
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
    </Box>
  );
};

export default Login;