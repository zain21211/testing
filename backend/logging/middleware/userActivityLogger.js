const loggingService = require("../services/loggingService");
const loggingConfig = require("../config/loggingConfig");

/**
 * User activity logging middleware
 * Logs specific user activities
 */
const userActivityLogger = (activity, description, metadata = {}) => {
  return (req, res, next) => {
    // Skip if user activity logging is disabled
    if (!loggingConfig.enableUserActivityLogging) {
      return next();
    }

    // Skip if activity is not in tracked activities
    if (!loggingConfig.trackedActivities.includes(activity)) {
      return next();
    }

    // Store original response methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Override response methods to log activity on success
    res.send = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        logActivity(activity, description, req, metadata);
      }
      return originalSend.call(this, data);
    };

    res.json = function (data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        logActivity(activity, description, req, metadata);
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Log user activity
 * @param {string} activity - Activity type
 * @param {string} description - Activity description
 * @param {Object} req - Express request object
 * @param {Object} metadata - Additional metadata
 */
async function logActivity(activity, description, req, metadata) {
  try {
    await loggingService.logUserActivity(activity, description, req, {
      ...metadata,
      timestamp: new Date().toISOString(),
      endpoint: req.route?.path || req.path,
      method: req.method,
    });
  } catch (error) {
    console.error("❌ Error logging user activity:", error);
  }
}

/**
 * Login activity logger
 */
const loginActivityLogger = userActivityLogger(
  "LOGIN",
  "User logged in successfully",
  { type: "authentication" }
);

/**
 * Logout activity logger
 */
const logoutActivityLogger = userActivityLogger("LOGOUT", "User logged out", {
  type: "authentication",
});

/**
 * Order creation activity logger
 */
const createOrderActivityLogger = userActivityLogger(
  "CREATE_ORDER",
  "User created a new order",
  { type: "order_management" }
);

/**
 * Order update activity logger
 */
const updateOrderActivityLogger = userActivityLogger(
  "UPDATE_ORDER",
  "User updated an order",
  { type: "order_management" }
);

/**
 * Order deletion activity logger
 */
const deleteOrderActivityLogger = userActivityLogger(
  "DELETE_ORDER",
  "User deleted an order",
  { type: "order_management" }
);

/**
 * Customer creation activity logger
 */
const createCustomerActivityLogger = userActivityLogger(
  "CREATE_CUSTOMER",
  "User created a new customer",
  { type: "customer_management" }
);

/**
 * Customer update activity logger
 */
const updateCustomerActivityLogger = userActivityLogger(
  "UPDATE_CUSTOMER",
  "User updated a customer",
  { type: "customer_management" }
);

/**
 * Product creation activity logger
 */
const createProductActivityLogger = userActivityLogger(
  "CREATE_PRODUCT",
  "User created a new product",
  { type: "product_management" }
);

/**
 * Product update activity logger
 */
const updateProductActivityLogger = userActivityLogger(
  "UPDATE_PRODUCT",
  "User updated a product",
  { type: "product_management" }
);

/**
 * Report viewing activity logger
 */
const viewReportActivityLogger = userActivityLogger(
  "VIEW_REPORT",
  "User viewed a report",
  { type: "reporting" }
);

/**
 * Data export activity logger
 */
const exportDataActivityLogger = userActivityLogger(
  "EXPORT_DATA",
  "User exported data",
  { type: "data_export" }
);

/**
 * File upload activity logger
 */
const uploadFileActivityLogger = userActivityLogger(
  "UPLOAD_FILE",
  "User uploaded a file",
  { type: "file_management" }
);

/**
 * File download activity logger
 */
const downloadFileActivityLogger = userActivityLogger(
  "DOWNLOAD_FILE",
  "User downloaded a file",
  { type: "file_management" }
);

/**
 * Search activity logger
 */
const searchActivityLogger = userActivityLogger(
  "SEARCH",
  "User performed a search",
  { type: "search" }
);

/**
 * Settings change activity logger
 */
const settingsChangeActivityLogger = userActivityLogger(
  "SETTINGS_CHANGE",
  "User changed settings",
  { type: "settings" }
);

/**
 * Password change activity logger
 */
const passwordChangeActivityLogger = userActivityLogger(
  "PASSWORD_CHANGE",
  "User changed password",
  { type: "security" }
);

/**
 * Profile update activity logger
 */
const profileUpdateActivityLogger = userActivityLogger(
  "PROFILE_UPDATE",
  "User updated profile",
  { type: "profile" }
);

/**
 * System access activity logger
 */
const systemAccessActivityLogger = userActivityLogger(
  "SYSTEM_ACCESS",
  "User accessed system",
  { type: "system_access" }
);

/**
 * Custom activity logger factory
 * @param {string} activity - Activity type
 * @param {string} description - Activity description
 * @param {Object} metadata - Additional metadata
 * @returns {Function} Middleware function
 */
const createActivityLogger = (activity, description, metadata = {}) => {
  return userActivityLogger(activity, description, metadata);
};

/**
 * Batch activity logger
 * Logs multiple activities at once
 */
const batchActivityLogger = (activities) => {
  return async (req, res, next) => {
    try {
      const promises = activities.map(({ activity, description, metadata }) =>
        loggingService.logUserActivity(activity, description, req, metadata)
      );

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("❌ Error in batch activity logger:", error);
    }

    next();
  };
};

module.exports = {
  userActivityLogger,
  loginActivityLogger,
  logoutActivityLogger,
  createOrderActivityLogger,
  updateOrderActivityLogger,
  deleteOrderActivityLogger,
  createCustomerActivityLogger,
  updateCustomerActivityLogger,
  createProductActivityLogger,
  updateProductActivityLogger,
  viewReportActivityLogger,
  exportDataActivityLogger,
  uploadFileActivityLogger,
  downloadFileActivityLogger,
  searchActivityLogger,
  settingsChangeActivityLogger,
  passwordChangeActivityLogger,
  profileUpdateActivityLogger,
  systemAccessActivityLogger,
  createActivityLogger,
  batchActivityLogger,
};
