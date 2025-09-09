const errorService = require("../services/errorService");
const loggingConfig = require("../config/loggingConfig");

/**
 * Error logging middleware
 * Catches and logs all unhandled errors
 */
const errorLogger = (error, req, res, next) => {
  // Skip error logging if disabled
  if (!loggingConfig.enableErrorLogging) {
    return next(error);
  }

  // Log the error
  errorService.handleError(error, req, res, {
    middleware: "errorLogger",
    timestamp: new Date().toISOString(),
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.name = "NotFoundError";

  next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler
 */
const validationErrorHandler = (error, req, res, next) => {
  if (error.name === "ValidationError") {
    error.statusCode = 422;
    error.name = "ValidationError";
  }
  next(error);
};

/**
 * Database error handler
 */
const databaseErrorHandler = (error, req, res, next) => {
  if (error.name === "CastError") {
    error.statusCode = 400;
    error.name = "ValidationError";
    error.message = "Invalid ID format";
  } else if (error.code === 11000) {
    error.statusCode = 409;
    error.name = "DuplicateError";
    error.message = "Duplicate entry found";
  } else if (error.name === "MongoError" || error.name === "MongooseError") {
    error.statusCode = 500;
    error.name = "DatabaseError";
    error.message = "Database operation failed";
  }
  next(error);
};

/**
 * JWT error handler
 */
const jwtErrorHandler = (error, req, res, next) => {
  if (error.name === "JsonWebTokenError") {
    error.statusCode = 401;
    error.name = "AuthenticationError";
    error.message = "Invalid token";
  } else if (error.name === "TokenExpiredError") {
    error.statusCode = 401;
    error.name = "AuthenticationError";
    error.message = "Token expired";
  }
  next(error);
};

/**
 * Rate limiting error handler
 */
const rateLimitErrorHandler = (error, req, res, next) => {
  if (error.statusCode === 429) {
    error.name = "RateLimitError";
    error.message = "Too many requests, please try again later";
  }
  next(error);
};

/**
 * Global error handler
 * This should be the last error handling middleware
 */
const globalErrorHandler = (error, req, res, next) => {
  // If response was already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  // Log the error
  errorService.handleError(error, req, res, {
    middleware: "globalErrorHandler",
    timestamp: new Date().toISOString(),
  });
};

/**
 * Unhandled promise rejection handler
 */
const unhandledRejectionHandler = () => {
  process.on("unhandledRejection", (reason, promise) => {
    console.error(
      "❌ Unhandled Promise Rejection at:",
      promise,
      "reason:",
      reason
    );

    // Log the error
    const error = new Error(`Unhandled Promise Rejection: ${reason}`);
    error.name = "UnhandledRejectionError";
    error.promise = promise;
    error.reason = reason;

    // Create a mock request for logging
    const mockReq = {
      headers: { "x-unhandled": "true" },
      path: "/unhandled-rejection",
      route: { path: "/unhandled-rejection" },
    };

    errorService.handleError(error, mockReq, null, {
      type: "unhandledRejection",
      promise: promise,
      reason: reason,
    });
  });
};

/**
 * Uncaught exception handler
 */
const uncaughtExceptionHandler = () => {
  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);

    // Log the error
    error.name = "UncaughtExceptionError";

    // Create a mock request for logging
    const mockReq = {
      headers: { "x-uncaught": "true" },
      path: "/uncaught-exception",
      route: { path: "/uncaught-exception" },
    };

    errorService.handleError(error, mockReq, null, {
      type: "uncaughtException",
    });

    // Exit the process
    process.exit(1);
  });
};

/**
 * Initialize error handlers
 */
const initializeErrorHandlers = () => {
  unhandledRejectionHandler();
  uncaughtExceptionHandler();
};

module.exports = {
  errorLogger,
  notFoundHandler,
  asyncHandler,
  validationErrorHandler,
  databaseErrorHandler,
  jwtErrorHandler,
  rateLimitErrorHandler,
  globalErrorHandler,
  initializeErrorHandlers,
};
