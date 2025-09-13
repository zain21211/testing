const ErrorLog = require("../models/ErrorLog");
const loggingConfig = require("../config/loggingConfig");

class ErrorService {
  constructor() {
    this.errorCounts = new Map();
    this.alertThresholds = loggingConfig.alertThresholds;
  }

  /**
   * Handle and log application errors
   * @param {Error} error
   * @param {Object|null} req
   * @param {Object|null} res
   * @param {Object} additionalContext
   */
  async handleError(error, req = null, res = null, additionalContext = {}) {
    try {
      const loggingService = require("./loggingService");
      await loggingService.logError(error, req, additionalContext);

      await this.checkErrorRateAlerts(error, req);

      this.sendErrorResponse(error, req, res);
    } catch (logError) {
      console.error("❌ Error in error handler:", logError);
      this.sendGenericErrorResponse(res);
    }
  }

  async checkErrorRateAlerts(error, req = {}) {
    try {
      const endpoint = req?.route?.path || req?.path || "unknown";
      const now = Date.now();
      const timeWindow = 5 * 60 * 1000; // 5 minutes

      if (!this.errorCounts.has(endpoint)) {
        this.errorCounts.set(endpoint, []);
      }

      const endpointErrors = this.errorCounts.get(endpoint);
      endpointErrors.push(now);

      const recentErrors = endpointErrors.filter(
        (timestamp) => now - timestamp < timeWindow
      );
      this.errorCounts.set(endpoint, recentErrors);

      const errorRate = recentErrors.length / (timeWindow / 1000); // errors/sec

      if (errorRate > this.alertThresholds.errorRate) {
        await this.sendErrorRateAlert(endpoint, errorRate, recentErrors.length);
      }
    } catch (alertError) {
      console.error("❌ Error checking error rate alerts:", alertError);
    }
  }

  async sendErrorRateAlert(endpoint, errorRate, errorCount) {
    try {
      console.warn(`🚨 HIGH ERROR RATE ALERT: ${endpoint}`);
      console.warn(`   Error Rate: ${errorRate.toFixed(2)} errors/sec`);
      console.warn(`   Error Count: ${errorCount} in 5 minutes`);
      console.warn(
        `   Threshold: ${this.alertThresholds.errorRate} errors/sec`
      );

      const alertError = new Error(`High error rate detected on ${endpoint}`);
      alertError.name = "ErrorRateAlert";
      alertError.endpoint = endpoint;
      alertError.errorRate = errorRate;
      alertError.errorCount = errorCount;

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

  sendErrorResponse(error, req = {}, res = null) {
    const statusCode = error.statusCode || error.status || 500;
    const message = this.getErrorMessage(error, statusCode);

    const errorResponse = {
      success: false,
      error: {
        message,
        code: error.code || "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
        requestId: req?.headers?.["x-request-id"] || "unknown",
      },
    };

    if (process.env.NODE_ENV === "development") {
      errorResponse.error.stack = error.stack;
    }

    if (res && typeof res.status === "function") {
      res.status(statusCode).json(errorResponse);
    } else {
      console.error(
        "⚠️ Cannot send error response: 'res' is missing or invalid."
      );
      console.error(JSON.stringify(errorResponse, null, 2));
    }
  }

  sendGenericErrorResponse(res = null) {
    const fallbackResponse = {
      success: false,
      error: {
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
    };

    if (res && typeof res.status === "function") {
      res.status(500).json(fallbackResponse);
    } else {
      console.error(
        "⚠️ Cannot send generic error response: 'res' is missing or invalid."
      );
      console.error(JSON.stringify(fallbackResponse, null, 2));
    }
  }

  getErrorMessage(error, statusCode) {
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

  async markErrorAsResolved(errorId, resolvedBy, notes) {
    try {
      const errorLog = await ErrorLog.findById(errorId);
      if (!errorLog) throw new Error("Error log not found");
      await errorLog.markAsResolved(resolvedBy, notes);
      return errorLog;
    } catch (error) {
      console.error("❌ Error marking error as resolved:", error);
      throw error;
    }
  }

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

  async getErrorTrends(startDate, endDate) {
    try {
      const trends = await ErrorLog.aggregate([
        {
          $match: {
            timestamp: { $gte: startDate, $lte: endDate },
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
        { $sort: { _id: 1 } },
      ]);

      return trends;
    } catch (error) {
      console.error("❌ Error getting error trends:", error);
      return [];
    }
  }

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
