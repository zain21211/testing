'use strict';

// ── Error handlers first (sync, safe to call immediately) ─────────────────────
const { initializeErrorHandlers } = require("./logging/middleware/errorLogger");
initializeErrorHandlers();

const http        = require("http");
const { Server }  = require("socket.io");
const cors        = require("cors");
const express     = require("express");
const bodyParser  = require("body-parser");

const { connectMongoDB }      = require("./logging/config/mongodb");
const dbConnection            = require("./database/connection");

const orderRoutes             = require("./routes/orderRoutes");
const loginRouter             = require("./routes/loginRoutes");
const ledgerRoutes            = require("./routes/ledgerRoutes");
const invoiceRoutes           = require("./routes/invoiceRoutes");
const customerRoutes          = require("./routes/customerRoutes");
const productRoutes           = require("./routes/productRoutes");
const discountRoutes          = require("./routes/discountRoutes");
const schemeRoutes            = require("./routes/schemeRoutes");
const balanceRoutes           = require("./routes/balanceRoutes");
const CashEntryRoutes         = require("./routes/CashEntryRoutes");
const reportRoutes            = require("./routes/reportRoutes");
const saleRoutes              = require("./routes/salesRoutes");
const coaRoutes               = require("./routes/coaRoutes");
const turnoverReport          = require("./routes/turnOverReport");
const formVisibilityRoutes    = require("./routes/formVisibilityRoutes");
const imageViewerRoutes       = require("./routes/imageViewerRoutes");
const logsRoutes              = require("./logging/routes/logsRoutes");
const frontendLogsRoutes      = require("./logging/routes/frontendLogsRoutes");

const { createRequestLogger } = require("./logging/middleware/requestLogger");
const {
  errorLogger,
  notFoundHandler,
  globalErrorHandler,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
} = require("./logging/middleware/errorLogger");

const ledgerControllers = require("./controllers/ledgerContollers");

// ── Main async startup ─────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. MongoDB FIRST — logs can't work without it, but we won't crash if it's missing
    try {
      await connectMongoDB();
      console.log("✅ MongoDB (logging) connected");
    } catch (mongoErr) {
      console.error("⚠️ MongoDB connection failed, proceeding without logging database:", mongoErr.message);
    }

    // 2. Build Express app
    const app = express();
    const server = http.createServer(app);

    // 3. Socket.io
    const io = new Server(server, {
      cors: { origin: "*", methods: ["GET", "POST", "PUT", "DELETE"] },
    });
    app.set("io", io);
    io.on("connection", (socket) => {
      console.log("🔌 Client connected:", socket.id);
    });

    // 4. Core middleware
    app.use(cors());
    app.set("trust proxy", true);

    // 5. Request logger — decodes JWT from header without requiring req.user
    app.use(
      createRequestLogger((req) => ({
        ...(() => {
          try {
            const auth = req.headers?.authorization;
            if (auth?.startsWith("Bearer ")) {
              const parts = auth.slice(7).split(".");
              if (parts.length >= 2) {
                const payload = JSON.parse(
                  Buffer.from(parts[1], "base64").toString("utf8")
                );
                return {
                  username: payload?.username ?? payload?.sub,
                  userType: payload?.userType ?? payload?.role,
                };
              }
            }
          } catch (_) {}
          return {};
        })(),
        sessionId: req.headers["x-session-id"],
      }))
    );

    app.use(express.static(__dirname));
    app.use(express.json({ limit: "100mb" }));
    app.use(express.urlencoded({ extended: true, limit: "100mb" }));

    // 6. Routes
    app.post("/api/ledger/download-pdf", ledgerControllers.downloadPdf); // direct — must stay above ledgerRoutes
    app.use("/api/ledger",          ledgerRoutes);
    app.use("/api/invoices",        invoiceRoutes);
    app.use("/api/customers",       customerRoutes);
    app.use("/api/login",           loginRouter);
    app.use("/api/create-order",    orderRoutes);
    app.use("/api/products",        productRoutes);
    app.use("/api/discount",        discountRoutes);
    app.use("/api/scheme",          schemeRoutes);
    app.use("/api/balance",         balanceRoutes);
    app.use("/api/cash-entry",      CashEntryRoutes);
    app.use("/api",                 reportRoutes);
    app.use("/api",                 saleRoutes);
    app.use("/api/coa",             coaRoutes);
    app.use("/api/turnover",        turnoverReport);
    app.use("/api/form-visibility", formVisibilityRoutes);
    app.use("/api/image-viewer",    imageViewerRoutes);
    app.use("/api/logs",            logsRoutes);
    app.use("/api/logs",            frontendLogsRoutes);

    // 7. Error handlers (must be last)
    app.use(validationErrorHandler);
    app.use(databaseErrorHandler);
    app.use(jwtErrorHandler);
    app.use(notFoundHandler);
    app.use(globalErrorHandler);

    // 8. Start listening AFTER everything is ready
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ HTTP server running on http://100.122.80.93:${PORT}`);
    });

    // 9. SQL keep-alive — start AFTER server is up
    setInterval(async () => {
      try {
        const pool = await dbConnection();
        await pool.request().query("SELECT top 1 id from coa");
        console.log("🔄 Keep-alive ping sent");
      } catch (err) {
        console.error("❌ Keep-alive failed:", err.message);
      }
    }, 30000);

    module.exports = { io };

  } catch (err) {
    console.error("❌ Server failed to start:", err);
    process.exit(1); // crash loudly so PM2 / nodemon can restart cleanly
  }
};

startServer();
