// src/pages/Login.jsx or src/components/Login.jsx
import React, { useState, useEffect } from "react";
import axios from "axios"; // Ensure you have axios installed
import { useNavigate, Link as RouterLink } from "react-router-dom"; // Renamed Link to RouterLink to avoid conflict with MUI Link

// Material UI Components
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Link as MuiLink, // MUI Link
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@mui/material";

const paymentVoucher = ['admin', 'payment']
const packingList = ['pack', 'admin', 'operator']
const list = ["sm", 'admin']
const forSpo = ['spo', 'admin', 'operator'] // for sales and spoworking

// const spoWorking = ['spo']
// Material UI Icons
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
// import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined"; // Not used in the form currently
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { jwtDecode } from "jwt-decode";

const url = import.meta.env.VITE_API_URL
const Login = () => {
  // const [name, setName] = useState(""); // 'name' state was not used in login form, can be removed if not needed for other logic
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  // const [decoded, setDecoded] = useState({}); // 'decoded' state not actively used elsewhere, jwtDecode result used directly
  const navigate = useNavigate();
  const [checked, setChecked] = useState(true); // For "Remember Me"
  const [isCustomer, setIsCustomer] = useState(false);
  // const [user, setUser] = useState(null); // 'user' state seems redundant with 'userData'

  // Helper function to check token expiration
  function isTokenExpired(token) {
    if (!token) return true; // No token means it's effectively expired/invalid
    try {
      const decodedToken = jwtDecode(token);
      if (!decodedToken.exp) return false; // No expiration claim, assume not expired
      return decodedToken.exp < Date.now() / 1000; // Compare exp time with current time
    } catch (e) {
      console.error("Invalid token:", e);
      return true; // Invalid token structure
    }
  }

  // Effect 1: Initialize component state from localStorage on mount
  useEffect(() => {
    const tokenFromStorage = localStorage.getItem("authToken");
    const userStringFromStorage = localStorage.getItem("user");

    if (tokenFromStorage && userStringFromStorage) {
      if (!isTokenExpired(tokenFromStorage)) {
        try {
          const parsedUser = JSON.parse(userStringFromStorage);
          setUserData(parsedUser);
          setIsLoggedIn(true);
          // isCustomer will be set by Effect 2 based on userData
        } catch (e) {
          console.error("Failed to parse user data from localStorage:", e);
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
          setIsLoggedIn(false);
          setUserData(null);
        }
      } else {
        // Token exists but is expired
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        setUserData(null);
      }
    } else {
      // No token or no user string in localStorage
      setIsLoggedIn(false);
      setUserData(null);
    }
  }, []); // Empty dependency array means this runs only once on mount

  const userTypes = ["sm", "admin", "operator"];
  const userType = userData?.userType?.toLowerCase() || "";
  let isList = false;
  if (userTypes.some(type => userType.includes(type))) {
    isList = true
  }

  // Effect 2: Update isCustomer whenever userData changes
  useEffect(() => {
    if (userData && typeof userData.userType === 'string') {
      const customerCheck = userData.userType.toLowerCase().includes("cust");
      setIsCustomer(customerCheck);
    } else {
      setIsCustomer(false); // Reset if no userData or userType is not a string
    }
  }, [userData]); // This effect runs when userData changes

  // Effect 3: Handle redirection for customers
  useEffect(() => {
    if (isLoggedIn && isCustomer && userData) {
      // console.log("Customer detected, navigating to /order. UserData:", userData);
      navigate("/order");
    }
  }, [isLoggedIn, isCustomer, userData, navigate]);

  // Runs when these dependencies change  // Effect 3: Handle redirection for customers
  useEffect(() => {
    const isSpo = userData?.userType?.toLowerCase().includes("spo");
    if (isLoggedIn && isSpo && userData) {
      // console.log("Customer detected, navigating to /order. UserData:", userData);
      navigate("/turnoverreport");
    }
  }, [isLoggedIn, isCustomer, userData, navigate]); // Runs when these dependencies change

  const handleChangeRememberMe = (event) => {
    setChecked(event.target.checked);
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    console.log("api")


    try {
      const response = await axios.post(
        `${url}/login`,
        {
          // username: name, // If 'name' was meant to be username, it should be sent
          password: password,
          checked: checked // Assuming 'checked' is 'rememberMe'
        }
      );

      const receivedToken = response.data.token;
      // console.log("expires in: ", response.data.options);
      const userFromApi = jwtDecode(receivedToken);

      localStorage.setItem("authToken", receivedToken);
      localStorage.setItem("user", JSON.stringify(userFromApi));

      setUserData(userFromApi); // This will trigger Effect 2 and then potentially Effect 3
      setIsLoggedIn(true);      // This will also contribute to triggering Effect 3

      // No direct navigation here; Effect 3 will handle it.
      setPassword(""); // Clear password on successful login
    } catch (err) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (axios.isAxiosError(err) && err.response) {
        errorMessage =
          err.response.data.message || err.response.data.error || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      console.error("Login failed:", err);
      setError(errorMessage);
      setPassword("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserData(null);
    setIsCustomer(false); // Ensure isCustomer is also reset
    // setName(""); // Clear name field if it were used
    setPassword("");
    // Navigate to login page or home page if not already on it
    // navigate("/login"); // Or simply let the component re-render to show the form
  };

  // Conditional Rendering Logic
  if (isLoggedIn) {

    // for usertype customer
    if (isCustomer || userData?.userType?.toLowerCase().includes("spo")) {
      // User is a customer, Effect 3 should be redirecting them.
      // Show a loading indicator while the redirect happens.
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",

            // height: "80vh", // Use viewport height to center vertically
          }}
        >
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {/* {isCustomer ? 'Redirecting to your orders...' : 'Redirecting to your report...'} */}
            Redirecting to your report...
          </Typography>
        </Box>
      );
    }
    // For non-customer users, show the dashboard
    return (
      <Box
        sx={{
          padding: 2,
          display: "flex",
          alignItems: "center", // Vertically center content
          justifyContent: "center", // Horizontally center content
          minHeight: "calc(100vh - 110px)",
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: "80%",
            maxWidth: 1000,
            padding: 4,
            borderRadius: "35px",
            border: "1px solid",
            borderColor: "grey.300",
            textAlign: "center",
          }}
        >
          <Typography variant="h5" component="h2" gutterBottom>
            Welcome Back, {userData?.name || userData?.username || "User"}!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            You are logged in.
          </Typography>
          <Box sx={{
            mt: 8,
            display: "flex",
            marginX: "auto",
            maxWidth: "900px",
            flexDirection: { xs: 'column', md: 'row' },
            flexWrap: 'wrap',
            gap: 2,
            alignItems: 'center',
            justifyContent: 'center',
            "& > *": {
              width: { xs: "100%", md: "25%" }, // children full width only in column
            },
          }}>
            {/* <Box sx={{
            gap: 2,
            display: "grid",
            margin: "0 auto",
            maxWidth: "900px",
            gridTemplateColumns: { xs: 'repeat(1, 1fr)', md: "repeat(auto-fit, minmax(250px, 1fr))" },
          }}> */}
            {packingList.some(e => userType.includes(e)) && (
              <Button
                component={RouterLink}
                to="/pending"
                variant="contained"
                size="large"
                sx={{ py: 1.5, height: "60px", bgcolor: "#ff3d07ff", fontWeight: "Bold", flexGrow: 1 }}
              >
                Packing List
              </Button>
            )}
            {(forSpo.includes(userType) || userData?.username.includes("ZAIN")) && (
              <Button
                component={RouterLink}
                to="/turnoverreport"
                variant="contained"
                size="large"
                sx={{ py: 1.5, height: "60px", bgcolor: "#FFC107", fontWeight: "Bold ", color: "black", flexGrow: 1 }}
              >
                Spo Working
              </Button>
            )}
            {(paymentVoucher.includes(userType) || userData?.username.includes("ZAIN")) && (
              <Button
                component={RouterLink}
                to="/paymentvoucher"
                variant="contained"
                size="large"
                sx={{ flexGrow: 1, py: 1.5, height: "60px", bgcolor: "	#795548" }}
              >
                Payment Voucher
              </Button>
            )}
            {(userType !== 'payment' &&
              <>
                <Button
                  component={RouterLink}
                  to="/coa"
                  variant="contained"
                  size="large"
                  sx={{ py: 1.5, height: "60px", bgcolor: "#610051ff", fontWeight: "Bold", flexGrow: 1 }}
                >
                  Accounts
                </Button>

                <Button
                  component={RouterLink}
                  to="/recovery"
                  variant="contained"
                  size="large"
                  sx={{ py: 1.5, flexGrow: 1, height: "60px", bgcolor: "green" }}
                >
                  Recovery
                </Button>
                <Button
                  component={RouterLink}
                  to="/sales"
                  variant="contained"
                  size="large"
                  sx={{ py: 1.5, height: "60px", flexGrow: 1, bgcolor: "#009688" }}
                >
                  Sales
                </Button>
                <Button
                  component={RouterLink}
                  to="/order" // Non-customers can still go to create order manually
                  variant="contained"
                  size="large"
                  sx={{ py: 1.5, height: "60px", flexGrow: 1, }}
                >
                  Create New Order
                </Button>
              </>
            )}
            {isList && (
              <Button
                component={RouterLink}
                to="/list" // Non-customers can still go to create order manually
                variant="contained"
                size="large"
                sx={{ py: 1.5, height: "60px", flexGrow: 1, bgcolor: "#3f51b5" }}
              >
                Customer Route Order
              </Button>
            )}

          </Box>
          <Button
            onClick={handleLogout}
            variant="outlined"
            color="inherit"
            sx={{
              mt: 8, // Reduced margin top a bit
              width: { xs: '100%', md: '900px' },
              height: "60px",
              bgcolor: "error.main", // Using theme color for red
              color: "white",
              fontWeight: "bold",
              "&:hover": {
                bgcolor: "error.dark", // Darken on hover
                color: "white",
              },
            }}
          >
            Logout
          </Button>
        </Paper >
      </Box >
    );
  }

  // If not logged in, show the login form
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center", // Vertically center content
        justifyContent: "center", // Horizontally center content
        minHeight: "calc(100vh - 64px)", // Adjust 64px based on your AppBar height, if any
        bgcolor: "grey.100",
        padding: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 400,
          padding: 4,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.300",
        }}
      >
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            color="text.primary"
          >
            Login.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Access your account.
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Removed Name/Username field as it wasn't used in handleLogin payload */}
          <div>
            <Typography
              variant="body2"
              component="label"
              htmlFor="password-input"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5, fontWeight: "medium" }}
            >
              Password
            </Typography>
            <FormControl fullWidth variant="outlined">
              <OutlinedInput
                id="password-input"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                size="medium"
                startAdornment={
                  <InputAdornment position="start">
                    <LockOutlinedIcon color="action" />
                  </InputAdornment>
                }
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      disabled={isLoading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                }
              />
            </FormControl>
          </div>

          <Box sx={{ textAlign: "right", mt: -1.5 }}>
            <FormControlLabel
              control={<Checkbox checked={checked} onChange={handleChangeRememberMe} />}
              label="Remember Me"
            />
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              aria-live="assertive"
              onClose={() => setError(null)} // Allow dismissing error
            >
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{
              py: 1.5,
              mt: 2,
              transition: "background-color 0.15s ease-in-out",
              bgcolor: isLoading ? "primary.light" : "primary.main", // Adjusted loading color
              "&:hover": {
                bgcolor: isLoading ? "primary.light" : "primary.dark",
              },
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;