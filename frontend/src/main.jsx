// src/main.jsx or wherever your main layout component is

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from "react-redux";
import store from './store/index.js';
import { Box, useTheme, styled } from '@mui/material'; // Import styled if you want
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import './App.css'; // Your base CSS
import App from './App.jsx';
import Ledger from './Ledger.jsx';
import Login from './LoginPage.jsx';
import EstimatePage from './EstimatePage.jsx';
import BillingComponent from './BillingComponent.jsx';
import OrderForm from './OrderForm.jsx';
import Header from "./Header.jsx";
import RecoveryPaper from "./RecoveryPaper.jsx";
// import { registerSW } from 'virtual:pwa-register';
import SalesReport from './SalesReport.jsx';
import CustomerRouteList from './CustomerRouteList.jsx'
import PackingList from './packingList.jsx';
import PackingForm from './PackingForm.jsx';
import PaymentVoucher from './PaymentVoucher.jsx';
import TurnoverReport from './turnoverReport.jsx';
import COA from './coa'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('SW registered:', reg);
    }).catch((err) => {
      console.error('SW registration failed:', err);
    });
  });
}



// Create a styled component or use sx for the spacer Box
const ToolbarSpacer = styled(Box)(({ theme }) => theme.mixins.toolbar);
const queryClient = new QueryClient();
const AppLayout = () => {
  // const theme = useTheme(); // (Still need useTheme if using styled/sx)

  return (

    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'auto' }}>
      <Header /> {/* Your fixed header component */}
      <Box
        component="main"
      >
        <Routes>
          {/* Your routes */}
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/invoice/:id" element={<BillingComponent />} />
          <Route path="/order" element={<OrderForm />} />
          <Route path="/estimate" element={<EstimatePage />} />
          <Route path="/app" element={<App />} />
          <Route path="/recovery" element={<RecoveryPaper />} />
          <Route path="/sales" element={<SalesReport />} />
          <Route path="/list" element={<CustomerRouteList />} />
          <Route path="/pack/:id" element={<PackingForm />} />
          <Route path="/pending" element={<PackingList />} />
          <Route path="/paymentvoucher" element={<PaymentVoucher />} />
          <Route path="/turnoverreport" element={<TurnoverReport />} />
          <Route path="/coa" element={<COA />} />
        </Routes>
      </Box>

      {/* Optional Footer */}
    </Box>
  );
};

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </QueryClientProvider>
  </Provider>
);