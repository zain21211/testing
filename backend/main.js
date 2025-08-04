process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const https = require('https');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const orderRoutes = require('./routes/orderRoutes'); // Import your invoice route
const loginRouter = require('./routes/loginRoutes'); // Import your login rout
const ledgerRoutes = require('./routes/ledgerRoutes'); // Import your ledger route
const invoiceRoutes = require('./routes/invoiceRoutes'); // Import your invoice route
const customerRoutes = require('./routes/customerRoutes'); // Import your customer route
const productRoutes = require('./routes/productRoutes'); // Import your customer route
const discountRoutes = require('./routes/discountRoutes'); // Import your customer route
const schemeRoutes = require('./routes/schemeRoutes'); // Import your customer route
const balanceRoutes = require('./routes/balanceRoutes'); // Import your customer route
const CashEntryRoutes = require('./routes/CashEntryRoutes'); // Import your customer route
const reportRoutes = require('./routes/reportRoutes'); // Import your customer route
const saleRoutes = require('./routes/salesRoutes'); // Import your customer route

const coaRoutes = require("./routes/coaRoutes");
const turnoverReport = require('./routes/turnOverReport');

const app = express();
const port = 3000;

// Middleware
// app.use(cors({
//   origin: ['http://localhost:5173', 'https://thin-signs-marry.loca.lt', "http://100.72.169.90:5173"], // include tunnel URL
//   credentials: true
// }));
//app.use((req, res, next) => {
  //console.log("User-Agent:", req.headers['user-agent']);
  //console.log("Content-Type:", req.headers['content-type']);
  //console.log("Content-Length:", req.headers['content-length']);
  //next();
//});



const allowedOrigins = [
  'http://localhost:5173',
  'https://daily-sunny-pup.ngrok-free.app'
];

app.use(cors());

// ✅ Must handle OPTIONS
// app.options('/*', cors());


app.use(bodyParser.json());
app.use(express.static(__dirname)); // For serving frontend
app.use(express.json({ limit: '1mb' })); // or more, if needed
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Handle preflight OPTIONS requests globally
// app.options('*', cors());


// Login route
app.use('/api/login', loginRouter);

// GET route to fetch customers for Autocomplete - with SPO restriction
app.use('/api/customers', customerRoutes );

app.use('/api/invoices', invoiceRoutes); // Invoice route);
app.use('/api/create-order', orderRoutes); // Invoice route);
app.use('/api/products', productRoutes); // Invoice route);
app.use('/api/products', productRoutes); // Invoice route);
app.use('/api/discount', discountRoutes); // Invoice route);
app.use('/api/scheme', schemeRoutes); // Invoice route);
app.use('/api/balance', balanceRoutes); // Invoice route);
app.use('/api/cash-entry', CashEntryRoutes); // Invoice route);
app.use('/api', reportRoutes);
app.use('/api', saleRoutes);
// Ledger route with SPO restriction
app.use('/ledger', ledgerRoutes); 
app.use("/api/coa", coaRoutes);
app.use('/api/turnover', turnoverReport);

app.use((req, res) => {
  console.log("404 - Not Found:", req.originalUrl);
  res.status(404).send("Page not found");
});


 app.listen(3001, "0.0.0.0", () => {
  console.log('✅ HTTP server running on http://100.68.6.110:3001');
});