const ApiLog = require("../models/ApiLog");
const ErrorLog = require("../models/ErrorLog");
const UserActivity = require("../models/UserActivity");
const logFormatter = require("../utils/logFormatter");
const logSanitizer = require("../utils/logSanitizer");
const sessionManager = require("../utils/sessionManager");
const loggingConfig = require("../config/loggingConfig");

class LoggingService {
  constructor() {
    this.logQueue = [];
    this.isProcessing = false;
    this.batchSize = loggingConfig.logBatchSize;
    this.batchTimeout = loggingConfig.logBatchTimeout;

    // Start batch processing if async logging is enabled
    if (loggingConfig.enableAsyncLogging) {
      this.startBatchProcessing();
    }
  }

  /**
   * Log API request/response
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {number} responseTime - Response time in milliseconds
   */
  async logApiRequest(req, res, responseTime, userOverride) {
    try {
      // Skip logging for excluded endpoints
      if (this.shouldSkipLogging(req)) {
        return;
      }

      const logData = logFormatter.formatApiLog(
        req,
        res,
        responseTime,
        logSanitizer
      );

      // Apply explicit user override if provided
      if (userOverride && typeof userOverride === "object") {
        if (userOverride.username) logData.username = userOverride.username;
        if (userOverride.userType) logData.userType = userOverride.userType;
        if (userOverride.sessionId) logData.sessionId = userOverride.sessionId;
      }

      if (loggingConfig.enableAsyncLogging) {
        this.addToQueue("api", logData);
      } else {
        await this.saveApiLog(logData);
      }
    } catch (error) {
      console.error("❌ Error logging API request:", error);
    }
  }

  /**
   * Log error
   * @param {Error} error - Error object
   * @param {Object} req - Express request object
   * @param {Object} additionalContext - Additional context
   */
  async logError(error, req, additionalContext = {}) {
    try {
      const errorData = logFormatter.formatErrorLog(
        error,
        req,
        additionalContext,
        logSanitizer
      );

      if (loggingConfig.enableAsyncLogging) {
        this.addToQueue("error", errorData);
      } else {
        await this.saveErrorLog(errorData);
      }
    } catch (logError) {
      console.error("❌ Error logging error:", logError);
    }
  }

  /**
   * Log user activity
   * @param {string} activity - Activity type
   * @param {string} description - Activity description
   * @param {Object} req - Express request object
   * @param {Object} metadata - Additional metadata
   */
  async logUserActivity(activity, description, req, metadata = {}) {
    try {
      // Skip if user activity logging is disabled
      if (!loggingConfig.enableUserActivityLogging) {
        return;
      }

      // Skip if activity is not in tracked activities
      if (!loggingConfig.trackedActivities.includes(activity)) {
        return;
      }

      const activityData = logFormatter.formatUserActivity(
        activity,
        description,
        req,
        metadata,
        logSanitizer
      );

      if (loggingConfig.enableAsyncLogging) {
        this.addToQueue("activity", activityData);
      } else {
        await this.saveUserActivity(activityData);
      }

      // Update session activity
      const sessionId = req.headers["x-session-id"];
      if (sessionId) {
        sessionManager.updateSessionActivity(sessionId, {
          type: activity,
          description: description,
        });
      }
    } catch (error) {
      console.error("❌ Error logging user activity:", error);
    }
  }

  /**
   * Save API log directly to database
   * @param {Object} logData - Log data
   */
  async saveApiLog(logData) {
    try {
      const apiLog = new ApiLog(logData);
      await apiLog.save();
    } catch (error) {
      console.error("❌ Error saving API log:", error);
    }
  }

  /**
   * Save error log directly to database
   * @param {Object} logData - Log data
   */
  async saveErrorLog(logData) {
    try {
      const errorLog = new ErrorLog(logData);
      await errorLog.save();
    } catch (error) {
      console.error("❌ Error saving error log:", error);
    }
  }

  /**
   * Save user activity directly to database
   * @param {Object} logData - Log data
   */
  async saveUserActivity(logData) {
    try {
      const userActivity = new UserActivity(logData);
      await userActivity.save();
    } catch (error) {
      console.error("❌ Error saving user activity:", error);
    }
  }

  /**
   * Add log to processing queue
   * @param {string} type - Log type (api, error, activity)
   * @param {Object} data - Log data
   */
  addToQueue(type, data) {
    this.logQueue.push({ type, data, timestamp: Date.now() });

    // Process immediately if queue is full
    if (this.logQueue.length >= this.batchSize) {
      this.processQueue();
    }
  }

  /**
   * Process log queue
   */
  async processQueue() {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.logQueue.splice(0, this.batchSize);
      const promises = batch.map(({ type, data }) => {
        switch (type) {
          case "api":
            return this.saveApiLog(data);
          case "error":
            return this.saveErrorLog(data);
          case "activity":
            return this.saveUserActivity(data);
          default:
            return Promise.resolve();
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("❌ Error processing log queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start batch processing
   */
  startBatchProcessing() {
    setInterval(() => {
      this.processQueue();
    }, this.batchTimeout);
  }

  /**
   * Check if endpoint should be skipped for logging
   * @param {Object} req - Express request object
   * @returns {boolean} True if should skip
   */
  shouldSkipLogging(req) {
    const path = req.path || req.url;
    return loggingConfig.excludedEndpoints.some((endpoint) =>
      path.includes(endpoint)
    );
  }

  /**
   * Get API logs with filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Array} API logs
   */
  async getApiLogs(filters = {}, options = {}) {
    try {
      const query = {};

      if (filters.username) query.username = filters.username;
      if (filters.endpoint) query.endpoint = filters.endpoint;
      if (filters.method) query.method = filters.method;
      if (filters.success !== undefined) query.success = filters.success;
      if (filters.startDate && filters.endDate) {
        query.timestamp = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      const limit = options.limit || 100;
      const skip = options.skip || 0;
      const sort = options.sort || { timestamp: -1 };

      const res = await ApiLog.find(query).sort(sort).limit(limit).skip(skip);
      console.log("Retrieved API logs:", res);
      return res;
    } catch (error) {
      console.error("❌ Error getting API logs:", error);
      return [];
    }
  }

  /**
   * Get error logs with filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Array} Error logs
   */
  async getErrorLogs(filters = {}, options = {}) {
    try {
      const query = {};

      if (filters.username) query.username = filters.username;
      if (filters.errorType) query.errorType = filters.errorType;
      if (filters.severity) query.severity = filters.severity;
      if (filters.resolved !== undefined) query.resolved = filters.resolved;
      if (filters.startDate && filters.endDate) {
        query.timestamp = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      const limit = options.limit || 100;
      const skip = options.skip || 0;
      const sort = options.sort || { timestamp: -1 };

      return await ErrorLog.find(query).sort(sort).limit(limit).skip(skip);
    } catch (error) {
      console.error("❌ Error getting error logs:", error);
      return [];
    }
  }

  /**
   * Get user activities with filters
   * @param {Object} filters - Filter options
   * @param {Object} options - Query options
   * @returns {Array} User activities
   */
  async getUserActivities(filters = {}, options = {}) {
    try {
      const query = {};

      if (filters.username) query.username = filters.username;
      if (filters.activity) query.activity = filters.activity;
      if (filters.userType) query.userType = filters.userType;
      if (filters.success !== undefined) query.success = filters.success;
      if (filters.startDate && filters.endDate) {
        query.timestamp = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate),
        };
      }

      const limit = options.limit || 100;
      const skip = options.skip || 0;
      const sort = options.sort || { timestamp: -1 };

      return await UserActivity.find(query).sort(sort).limit(limit).skip(skip);
    } catch (error) {
      console.error("❌ Error getting user activities:", error);
      return [];
    }
  }

  /**
   * Get logging statistics
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Statistics
   */
  async getLoggingStats(startDate, endDate) {
    try {
      const [apiStats, errorStats, activityStats] = await Promise.all([
        ApiLog.getPerformanceStats(startDate, endDate),
        ErrorLog.getErrorStats(startDate, endDate),
        UserActivity.getActivityFrequency(startDate, endDate),
      ]);

      return {
        api: apiStats,
        errors: errorStats,
        activities: activityStats,
        sessionStats: sessionManager.getSessionStats(),
      };
    } catch (error) {
      console.error("❌ Error getting logging stats:", error);
      return { api: [], errors: [], activities: [], sessionStats: {} };
    }
  }
}

module.exports = new LoggingService();
