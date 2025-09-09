const ErrorLog = require("../models/ErrorLog");
const loggingConfig = require("../config/loggingConfig");

class ErrorService {
  constructor() {
    this.errorCounts = new Map();
    this.alertThresholds = loggingConfig.alertThresholds;
  }

  /**
   * Handle and log application errors
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Object} additionalContext - Additional context
   */
  async handleError(error, req, res, additionalContext = {}) {
    try {
      // Log the error
      const loggingService = require("./loggingService");
      await loggingService.logError(error, req, additionalContext);

      // Check for error rate alerts
      await this.checkErrorRateAlerts(error, req);

      // Send appropriate response
      this.sendErrorResponse(error, req, res);
    } catch (logError) {
      console.error("❌ Error in error handler:", logError);
      this.sendGenericErrorResponse(res);
    }
  }

  /**
   * Check error rate alerts
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   */
  async checkErrorRateAlerts(error, req) {
    try {
      const endpoint = req.route?.path || req.path;
      const now = Date.now();
      const timeWindow = 5 * 60 * 1000; // 5 minutes

      // Initialize error count for endpoint if not exists
      if (!this.errorCounts.has(endpoint)) {
        this.errorCounts.set(endpoint, []);
      }

      const endpointErrors = this.errorCounts.get(endpoint);

      // Add current error
      endpointErrors.push(now);

      // Remove old errors outside time window
      const recentErrors = endpointErrors.filter(
        (timestamp) => now - timestamp < timeWindow
      );
      this.errorCounts.set(endpoint, recentErrors);

      // Check if error rate exceeds threshold
      const errorRate = recentErrors.length / (timeWindow / 1000); // errors per second

      if (errorRate > this.alertThresholds.errorRate) {
        await this.sendErrorRateAlert(endpoint, errorRate, recentErrors.length);
      }
    } catch (alertError) {
      console.error("❌ Error checking error rate alerts:", alertError);
    }
  }

  /**
   * Send error rate alert
   * @param {string} endpoint - Endpoint with high error rate
   * @param {number} errorRate - Current error rate
   * @param {number} errorCount - Number of errors in time window
   */
  async sendErrorRateAlert(endpoint, errorRate, errorCount) {
    try {
      console.warn(`🚨 HIGH ERROR RATE ALERT: ${endpoint}`);
      console.warn(`   Error Rate: ${errorRate.toFixed(2)} errors/second`);
      console.warn(`   Error Count: ${errorCount} errors in 5 minutes`);
      console.warn(
        `   Threshold: ${this.alertThresholds.errorRate} errors/second`
      );

      // Here you could integrate with external alerting systems
      // like Slack, email, PagerDuty, etc.

      // Log critical error for this alert
      const alertError = new Error(`High error rate detected on ${endpoint}`);
      alertError.name = "ErrorRateAlert";
      alertError.endpoint = endpoint;
      alertError.errorRate = errorRate;
      alertError.errorCount = errorCount;

      // Create a mock request object for logging
      const mockReq = {
        route: { path: endpoint },
        path: endpoint,
        headers: { "x-alert": "true" },
      };

      const loggingService = require("./loggingService");
      await loggingService.logError(alertError, mockReq, {
        alertType: "ERROR_RATE_THRESHOLD",
        threshold: this.alertThresholds.errorRate,
      });
    } catch (alertError) {
      console.error("❌ Error sending error rate alert:", alertError);
    }
  }

  /**
   * Send appropriate error response
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  sendErrorResponse(error, req, res) {
    const statusCode = error.statusCode || error.status || 500;
    const message = this.getErrorMessage(error, statusCode);

    const errorResponse = {
      success: false,
      error: {
        message: message,
        code: error.code || "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req.headers["x-request-id"] || "unknown",
      },
    };

    // Add stack trace in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.error.stack = error.stack;
    }

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Send generic error response
   * @param {Object} res - Express response object
   */
  sendGenericErrorResponse(res) {
    res.status(500).json({
      success: false,
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Get appropriate error message
   * @param {Error} error - Error object
   * @param {number} statusCode - HTTP status code
   * @returns {string} Error message
   */
  getErrorMessage(error, statusCode) {
    // Don't expose internal error details in production
    if (process.env.NODE_ENV === "production") {
      switch (statusCode) {
        case 400:
          return "Bad request";
        case 401:
          return "Unauthorized";
        case 403:
          return "Forbidden";
        case 404:
          return "Not found";
        case 422:
          return "Validation error";
        case 429:
          return "Too many requests";
        case 500:
          return "Internal server error";
        case 502:
          return "Bad gateway";
        case 503:
          return "Service unavailable";
        default:
          return "An error occurred";
      }
    }

    return error.message || "An error occurred";
  }

  /**
   * Mark error as resolved
   * @param {string} errorId - Error log ID
   * @param {string} resolvedBy - Username who resolved it
   * @param {string} notes - Resolution notes
   * @returns {Object} Updated error log
   */
  async markErrorAsResolved(errorId, resolvedBy, notes) {
    try {
      const errorLog = await ErrorLog.findById(errorId);

      if (!errorLog) {
        throw new Error("Error log not found");
      }

      await errorLog.markAsResolved(resolvedBy, notes);
      return errorLog;
    } catch (error) {
      console.error("❌ Error marking error as resolved:", error);
      throw error;
    }
  }

  /**
   * Get unresolved errors
   * @param {Object} filters - Filter options
   * @returns {Array} Unresolved errors
   */
  async getUnresolvedErrors(filters = {}) {
    try {
      const query = { resolved: false };

      if (filters.severity) query.severity = filters.severity;
      if (filters.errorType) query.errorType = filters.errorType;
      if (filters.username) query.username = filters.username;

      return await ErrorLog.find(query)
        .sort({ timestamp: -1 })
        .limit(filters.limit || 100);
    } catch (error) {
      console.error("❌ Error getting unresolved errors:", error);
      return [];
    }
  }

  /**
   * Get error trends
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Error trends
   */
  async getErrorTrends(startDate, endDate) {
    try {
      const trends = await ErrorLog.aggregate([
        {
          $match: {
            timestamp: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
              },
              errorType: "$errorType",
              severity: "$severity",
            },
            count: { $sum: 1 },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ["$resolved", true] }, 1, 0] },
            },
          },
        },
        {
          $group: {
            _id: "$_id.date",
            totalErrors: { $sum: "$count" },
            resolvedErrors: { $sum: "$resolvedCount" },
            errorTypes: {
              $push: {
                type: "$_id.errorType",
                severity: "$_id.severity",
                count: "$count",
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]);

      return trends;
    } catch (error) {
      console.error("❌ Error getting error trends:", error);
      return [];
    }
  }

  /**
   * Clean up old resolved errors
   * @param {number} daysOld - Number of days old
   * @returns {number} Number of errors cleaned up
   */
  async cleanupOldResolvedErrors(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await ErrorLog.deleteMany({
        resolved: true,
        resolvedAt: { $lt: cutoffDate },
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old resolved errors`);
      return result.deletedCount;
    } catch (error) {
      console.error("❌ Error cleaning up old resolved errors:", error);
      return 0;
    }
  }
}

module.exports = new ErrorService();
