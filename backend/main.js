// Initialize logging system first
const { connectMongoDB } = require("./logging/config/mongodb");
const { initializeErrorHandlers } = require("./logging/middleware/errorLogger");

// Initialize error handlers
initializeErrorHandlers();

const http = require("http");
const { Server } = require("socket.io"); // Import socket.io server
const cors = require("cors");
const express = require("express");
const dbConnection = require("./database/connection"); // Import your database connection
const bodyParser = require("body-parser");
const orderRoutes = require("./routes/orderRoutes"); // Import your invoice route
const loginRouter = require("./routes/loginRoutes"); // Import your login rout
const ledgerRoutes = require("./routes/ledgerRoutes"); // Import your ledger route
const invoiceRoutes = require("./routes/invoiceRoutes"); // Import your invoice route
const customerRoutes = require("./routes/customerRoutes"); // Import your customer route
const productRoutes = require("./routes/productRoutes"); // Import your customer route
const discountRoutes = require("./routes/discountRoutes"); // Import your customer route
const schemeRoutes = require("./routes/schemeRoutes"); // Import your customer route
const balanceRoutes = require("./routes/balanceRoutes"); // Import your customer route
const CashEntryRoutes = require("./routes/CashEntryRoutes"); // Import your customer route
const reportRoutes = require("./routes/reportRoutes"); // Import your customer route
const saleRoutes = require("./routes/salesRoutes"); // Import your customer route
const authMiddleware = require("./middleware/tokenAuthentication"); // Import your auth middleware
const coaRoutes = require("./routes/coaRoutes");
const turnoverReport = require("./routes/turnOverReport");

// Import logging middleware
const { createRequestLogger } = require("./logging/middleware/requestLogger");
const {
  errorLogger,
  notFoundHandler,
  globalErrorHandler,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
} = require("./logging/middleware/errorLogger");
const logsRoutes = require("./logging/routes/logsRoutes");
const frontendLogsRoutes = require("./logging/routes/frontendLogsRoutes");

const app = express();

// Connect to MongoDB for logging
connectMongoDB().catch(console.error);

setInterval(async () => {
  try {
    const pool = await dbConnection();
    await pool.request().query("SELECT top 1 id from coa"); // lightweight query
    console.log("🔄 Keep-alive ping sent");
  } catch (err) {
    console.error("❌ Keep-alive failed:", err.message);
  }
}, 30000); // every 45 seconds

const server = http.createServer(app); // create HTTP server

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// store io inside express app
app.set("io", io);

// listen for socket connections
io.on("connection", (socket) => {
  console.log("🔌 Client connected:", socket.id);
});

app.use(cors());

// Trust proxy for accurate IP addresses
app.set("trust proxy", true);

// app.use(authMiddleware);
// Logging middleware (should be early in the middleware stack)
app.use(
  createRequestLogger((req) => ({
    // Derive user from JWT Authorization header (no req.user needed)
    ...(() => {
      try {
        const auth = req.headers && req.headers.authorization;
        if (auth && auth.startsWith("Bearer ")) {
          const token = auth.slice(7);
          const parts = token.split(".");
          if (parts.length >= 2) {
            const payloadJson = Buffer.from(parts[1], "base64").toString(
              "utf8"
            );
            const payload = JSON.parse(payloadJson);
            return {
              username: payload?.username || payload?.sub,
              userType: payload?.userType || payload?.role,
            };
          }
        }
      } catch (_) {}
      return {};
    })(),
    sessionId: req.headers["x-session-id"],
  }))
);

app.use(express.static(__dirname)); // For serving frontend
app.use(express.json({ limit: "100mb" })); // or more, if needed
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Login route
app.use("/api/login", loginRouter);

// GET route to fetch customers for Autocomplete - with SPO restriction
app.use("/api/customers", customerRoutes);

app.use("/api/invoices", invoiceRoutes); // Invoice route);
app.use("/api/create-order", orderRoutes); // Invoice route);
app.use("/api/products", productRoutes); // Invoice route);
app.use("/api/discount", discountRoutes); // Invoice route);
app.use("/api/scheme", schemeRoutes); // Invoice route);
app.use("/api/balance", balanceRoutes); // Invoice route);
app.use("/api/cash-entry", CashEntryRoutes); // Invoice route);
app.use("/api", reportRoutes);
app.use("/api", saleRoutes);
// Ledger route with SPO restriction
app.use("/api/ledger", ledgerRoutes);
app.use("/api/coa", coaRoutes);
app.use("/api/turnover", turnoverReport);

// Logs management routes
app.use("/api/logs", logsRoutes);
app.use("/api/logs", frontendLogsRoutes);

// Error handling middleware (should be last)
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(jwtErrorHandler);
app.use(notFoundHandler);
app.use(globalErrorHandler);

server.listen(3001, "0.0.0.0", () => {
  console.log("✅ HTTP server running on http://100.68.6.110:3001");
});

module.exports = { io };
