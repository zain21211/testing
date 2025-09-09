require("dotenv").config();

const loggingConfig = {
  // Log levels: DEBUG, INFO, WARN, ERROR
  level: process.env.LOG_LEVEL || "INFO",

  // Enable/disable different types of logging
  enableApiLogging: process.env.ENABLE_API_LOGGING !== "false",
  enableErrorLogging: process.env.ENABLE_ERROR_LOGGING !== "false",
  enableUserActivityLogging:
    process.env.ENABLE_USER_ACTIVITY_LOGGING !== "false",

  // Performance settings
  enableAsyncLogging: process.env.ENABLE_ASYNC_LOGGING !== "false",
  logBatchSize: parseInt(process.env.LOG_BATCH_SIZE) || 100,
  logBatchTimeout: parseInt(process.env.LOG_BATCH_TIMEOUT) || 5000, // 5 seconds

  // Data sanitization
  sanitizeSensitiveData: process.env.SANITIZE_SENSITIVE_DATA !== "false",
  maxPayloadSize: parseInt(process.env.MAX_PAYLOAD_SIZE) || 10000, // 10KB

  // Retention policies
  logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS) || 90,
  errorLogRetentionDays: parseInt(process.env.ERROR_LOG_RETENTION_DAYS) || 365,

  // Endpoints to exclude from logging
  excludedEndpoints: ["/health", "/ping", "/favicon.ico", "/robots.txt"],

  // Sensitive fields to sanitize
  sensitiveFields: [
    "password",
    "token",
    "authorization",
    "authToken",
    "secret",
    "key",
    "apiKey",
    "accessToken",
    "refreshToken",
    "ssn",
    "creditCard",
    "cvv",
    "pin",
  ],

  // User activity types to track
  trackedActivities: [
    "LOGIN",
    "LOGOUT",
    "CREATE_ORDER",
    "UPDATE_ORDER",
    "DELETE_ORDER",
    "CREATE_CUSTOMER",
    "UPDATE_CUSTOMER",
    "DELETE_CUSTOMER",
    "CREATE_PRODUCT",
    "UPDATE_PRODUCT",
    "DELETE_PRODUCT",
    "VIEW_REPORT",
    "EXPORT_DATA",
    "UPLOAD_FILE",
    "DOWNLOAD_FILE",
  ],

  // Error severity levels
  errorSeverity: {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4,
  },

  // Real-time monitoring
  enableRealTimeMonitoring: process.env.ENABLE_REAL_TIME_MONITORING !== "false",
  alertThresholds: {
    errorRate: parseFloat(process.env.ERROR_RATE_THRESHOLD) || 0.05, // 5%
    responseTime: parseInt(process.env.RESPONSE_TIME_THRESHOLD) || 5000, // 5 seconds
    concurrentUsers: parseInt(process.env.CONCURRENT_USERS_THRESHOLD) || 100,
  },
};

module.exports = loggingConfig;
