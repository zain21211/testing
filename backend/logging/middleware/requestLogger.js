const loggingService = require("../services/loggingService");
const sessionManager = require("../utils/sessionManager");
const loggingConfig = require("../config/loggingConfig");

/**
 * Request logging middleware
 * Logs all incoming API requests and responses
 */
const requestLogger = (req, res, next) => {
  // Skip logging if disabled
  if (!loggingConfig.enableApiLogging) {
    return next();
  }

  // Skip OPTIONS (preflight) and static asset requests
  if (req.method === "OPTIONS") {
    return next();
  }
  const pathLower = (req.path || req.url || "").toLowerCase();
  const isStatic =
    pathLower.startsWith("/assets/") ||
    pathLower.startsWith("/static/") ||
    pathLower.startsWith("/public/") ||
    pathLower.includes("/sw.js") ||
    /\.(js|css|map|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|txt)$/i.test(
      pathLower
    );
  if (isStatic) {
    return next();
  }

  // Skip excluded endpoints
  if (
    loggingConfig.excludedEndpoints.some((endpoint) =>
      req.path.includes(endpoint)
    )
  ) {
    return next();
  }

  const startTime = Date.now();

  // Generate request ID if not present
  if (!req.headers["x-request-id"]) {
    req.headers["x-request-id"] = require("uuid").v4();
  }

  // Generate session ID if not present
  if (!req.headers["x-session-id"]) {
    req.headers["x-session-id"] = require("uuid").v4();
  }

  // Set request ID in response headers
  res.setHeader("x-request-id", req.headers["x-request-id"]);
  res.setHeader("x-session-id", req.headers["x-session-id"]);

  // Derive user override from request or an injected override if available
  const user =
    req._loggingUserOverride && typeof req._loggingUserOverride === "object"
      ? req._loggingUserOverride
      : req.user
      ? {
          username: req.user.username,
          userType: req.user.userType,
          sessionId: req.headers["x-session-id"],
        }
      : undefined;

  // Store original response methods
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  // Response data storage
  let responseData = null;

  // Override res.send to capture response data
  res.send = function (data) {
    responseData = data;
    res.locals.responseData = data;
    return originalSend.call(this, data);
  };

  // Override res.json to capture response data
  res.json = function (data) {
    responseData = data;
    res.locals.responseData = data;
    return originalJson.call(this, data);
  };

  // Override res.end to capture response data
  res.end = function (data) {
    if (data && !responseData) {
      responseData = data;
      res.locals.responseData = data;
    }
    return originalEnd.call(this, data);
  };

  // Log request when response finishes
  res.on("finish", async () => {
    try {
      const responseTime = Date.now() - startTime;

      // Log the API request
      await loggingService.logApiRequest(req, res, responseTime, user);

      // Log user activity for certain endpoints
      await logUserActivityForEndpoint(req, res);
    } catch (error) {
      console.error("❌ Error in request logger:", error);
    }
  });

  // Handle response close/error events
  res.on("close", async () => {
    try {
      const responseTime = Date.now() - startTime;

      // Log the API request even if connection was closed
      await loggingService.logApiRequest(req, res, responseTime, user);
    } catch (error) {
      console.error("❌ Error in request logger (close):", error);
    }
  });

  next();
};

/**
 * Log user activity for specific endpoints
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function logUserActivityForEndpoint(req, res) {
  try {
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Only log successful requests
    if (statusCode < 200 || statusCode >= 400) {
      return;
    }

    let activity = null;
    let description = "";

    // Map endpoints to activities
    if (endpoint.includes("/login") && method === "POST") {
      activity = "LOGIN";
      description = "User logged in";
    } else if (endpoint.includes("/logout") && method === "POST") {
      activity = "LOGOUT";
      description = "User logged out";
    } else if (endpoint.includes("/create-order") && method === "POST") {
      activity = "CREATE_ORDER";
      description = "User created a new order";
    } else if (endpoint.includes("/orders") && method === "PUT") {
      activity = "UPDATE_ORDER";
      description = "User updated an order";
    } else if (endpoint.includes("/orders") && method === "DELETE") {
      activity = "DELETE_ORDER";
      description = "User deleted an order";
    } else if (endpoint.includes("/customers") && method === "POST") {
      activity = "CREATE_CUSTOMER";
      description = "User created a new customer";
    } else if (endpoint.includes("/customers") && method === "PUT") {
      activity = "UPDATE_CUSTOMER";
      description = "User updated a customer";
    } else if (endpoint.includes("/products") && method === "POST") {
      activity = "CREATE_PRODUCT";
      description = "User created a new product";
    } else if (endpoint.includes("/products") && method === "PUT") {
      activity = "UPDATE_PRODUCT";
      description = "User updated a product";
    } else if (endpoint.includes("/reports") && method === "GET") {
      activity = "VIEW_REPORT";
      description = "User viewed a report";
    } else if (endpoint.includes("/export") && method === "GET") {
      activity = "EXPORT_DATA";
      description = "User exported data";
    }

    if (activity) {
      await loggingService.logUserActivity(activity, description, req, {
        endpoint: endpoint,
        method: method,
        statusCode: statusCode,
      });
    }
  } catch (error) {
    console.error("❌ Error logging user activity:", error);
  }
}

module.exports = requestLogger;

// Factory to create a logger that can receive a user provider
module.exports.createRequestLogger = (getUser) => {
  return (req, res, next) => {
    try {
      req._loggingUserOverride =
        typeof getUser === "function" ? getUser(req) : undefined;
    } catch (_) {
      req._loggingUserOverride = undefined;
    }
    return requestLogger(req, res, next);
  };
};
