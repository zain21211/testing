import React from "react";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";
import Ledger from './Ledger.jsx';
import Login from './LoginPage.jsx';
import { Box } from '@mui/material';
import OrderForm from './OrderForm.jsx';
import PackingList from './packingList.jsx';
import SalesReport from './SalesReport.jsx';
import PackingForm from './PackingForm.jsx';
import CreateCustomer from './CreateCustomer';
import EstimatePage from './EstimatePage.jsx';
import RecoveryPaper from "./RecoveryPaper.jsx";
import { Routes, Route } from 'react-router-dom';
import PaymentVoucher from './PaymentVoucher.jsx';
import TurnoverReport from './turnoverReport.jsx';
import BillingComponent from './BillingComponent.jsx';
import CustomerRouteList from './CustomerRouteList.jsx';
import ApiLogViewer from './components/ApiLogViewer';
import CustomerDashboard from "./components/LoadForm/CustomerDashbord.jsx";
import DeliveryForm from "./components/delivery form/deliveryForm.jsx";
import ProductsList from "./components/productsLIst/productsList.jsx";
import QRCodeGenerator from './pages/QRCodeGenerator';

const AppLayout = () => {
    // const theme = useTheme(); // (Still need useTheme if using styled/sx)

    return (

        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 'auto' }}>
            <Header /> {/* Your fixed header component */}
            <Box component="main">
                <Routes>
                    {/* Your routes */}
                    <Route path="/" element={<Login />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/order" element={<OrderForm />} />
                    <Route path="/sales" element={<SalesReport />} />
                    <Route path="/coa" element={<CreateCustomer />} />
                    <Route path="/pending" element={<PackingList />} />
                    <Route path="/pack/:id" element={<PackingForm />} />
                    <Route path="/estimate" element={<EstimatePage />} />
                    <Route path="/list" element={<CustomerRouteList />} />
                    <Route path="/recovery" element={<RecoveryPaper />} />
                    <Route path="/invoice/:id" element={<BillingComponent />} />
                    <Route path="/paymentvoucher" element={<PaymentVoucher />} />
                    <Route path="/turnoverreport" element={<TurnoverReport />} />
                    <Route path="/logs" element={<ApiLogViewer />} />
                    <Route path="/load" element={<CustomerDashboard />} />
                    <Route path="/delivery" element={<DeliveryForm />} />
                    <Route path="/productsList" element={<ProductsList />} />
                    <Route path="/qr-generator" element={<QRCodeGenerator />} />

                </Routes>
            </Box>

            {/* Optional Footer */}
            <Footer />
        </Box>
    );
};


export default AppLayout;