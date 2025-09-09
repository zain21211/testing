const express = require("express");
const router = express.Router();
const loggingService = require("../services/loggingService");
const errorService = require("../services/errorService");
const { asyncHandler } = require("../middleware/errorLogger");

/**
 * Get API logs with filters
 * GET /api/logs/api
 */
router.get(
  "/api",
  asyncHandler(async (req, res) => {
    const {
      username,
      endpoint,
      method,
      success,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      sort = "timestamp:-1",
    } = req.query;

    const filters = {
      username,
      endpoint,
      method,
      success: success !== undefined ? success === "true" : undefined,
      startDate,
      endDate,
    };

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort: sort.split(":").reduce((acc, curr, index, array) => {
        if (index % 2 === 0) {
          acc[curr] = array[index + 1] === "1" ? 1 : -1;
        }
        return acc;
      }, {}),
    };

    const logs = await loggingService.getApiLogs(filters, options);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters,
      options,
    });
  })
);

/**
 * Get error logs with filters
 * GET /api/logs/errors
 */
router.get(
  "/errors",
  asyncHandler(async (req, res) => {
    const {
      username,
      errorType,
      severity,
      resolved,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      sort = "timestamp:-1",
    } = req.query;

    const filters = {
      username,
      errorType,
      severity,
      resolved: resolved !== undefined ? resolved === "true" : undefined,
      startDate,
      endDate,
    };

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort: sort.split(":").reduce((acc, curr, index, array) => {
        if (index % 2 === 0) {
          acc[curr] = array[index + 1] === "1" ? 1 : -1;
        }
        return acc;
      }, {}),
    };

    const logs = await loggingService.getErrorLogs(filters, options);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters,
      options,
    });
  })
);

/**
 * Get user activities with filters
 * GET /api/logs/activities
 */
router.get(
  "/activities",
  asyncHandler(async (req, res) => {
    const {
      username,
      activity,
      userType,
      success,
      startDate,
      endDate,
      limit = 100,
      skip = 0,
      sort = "timestamp:-1",
    } = req.query;

    const filters = {
      username,
      activity,
      userType,
      success: success !== undefined ? success === "true" : undefined,
      startDate,
      endDate,
    };

    const options = {
      limit: parseInt(limit),
      skip: parseInt(skip),
      sort: sort.split(":").reduce((acc, curr, index, array) => {
        if (index % 2 === 0) {
          acc[curr] = array[index + 1] === "1" ? 1 : -1;
        }
        return acc;
      }, {}),
    };

    const logs = await loggingService.getUserActivities(filters, options);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters,
      options,
    });
  })
);

/**
 * Get logging statistics
 * GET /api/logs/stats
 */
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await loggingService.getLoggingStats(start, end);

    res.json({
      success: true,
      data: stats,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  })
);

/**
 * Get unresolved errors
 * GET /api/logs/errors/unresolved
 */
router.get(
  "/errors/unresolved",
  asyncHandler(async (req, res) => {
    const { severity, errorType, username, limit = 100 } = req.query;

    const filters = {
      severity,
      errorType,
      username,
      limit: parseInt(limit),
    };

    const errors = await errorService.getUnresolvedErrors(filters);

    res.json({
      success: true,
      data: errors,
      count: errors.length,
      filters,
    });
  })
);

/**
 * Mark error as resolved
 * PUT /api/logs/errors/:errorId/resolve
 */
router.put(
  "/errors/:errorId/resolve",
  asyncHandler(async (req, res) => {
    const { errorId } = req.params;
    const { resolvedBy, notes } = req.body;

    if (!resolvedBy) {
      return res.status(400).json({
        success: false,
        error: {
          message: "resolvedBy is required",
          code: "VALIDATION_ERROR",
        },
      });
    }

    const errorLog = await errorService.markErrorAsResolved(
      errorId,
      resolvedBy,
      notes
    );

    res.json({
      success: true,
      data: errorLog,
      message: "Error marked as resolved successfully",
    });
  })
);

/**
 * Get error trends
 * GET /api/logs/errors/trends
 */
router.get(
  "/errors/trends",
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const end = endDate ? new Date(endDate) : new Date();

    const trends = await errorService.getErrorTrends(start, end);

    res.json({
      success: true,
      data: trends,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  })
);

/**
 * Clean up old resolved errors
 * DELETE /api/logs/errors/cleanup
 */
router.delete(
  "/errors/cleanup",
  asyncHandler(async (req, res) => {
    const { daysOld = 30 } = req.query;

    const cleanedCount = await errorService.cleanupOldResolvedErrors(
      parseInt(daysOld)
    );

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old resolved errors`,
      cleanedCount,
    });
  })
);

/**
 * Get API performance statistics
 * GET /api/logs/performance
 */
router.get(
  "/performance",
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const end = endDate ? new Date(endDate) : new Date();

    const ApiLog = require("../models/ApiLog");
    const performanceStats = await ApiLog.getPerformanceStats(start, end);

    res.json({
      success: true,
      data: performanceStats,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  })
);

/**
 * Get user activity statistics
 * GET /api/logs/activities/stats
 */
router.get(
  "/activities/stats",
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    const end = endDate ? new Date(endDate) : new Date();

    const UserActivity = require("../models/UserActivity");
    const activityStats = await UserActivity.getUserActivityStats(start, end);
    const activityFrequency = await UserActivity.getActivityFrequency(
      start,
      end
    );

    res.json({
      success: true,
      data: {
        userStats: activityStats,
        frequency: activityFrequency,
      },
      period: {
        startDate: start,
        endDate: end,
      },
    });
  })
);

/**
 * Get session information
 * GET /api/logs/sessions
 */
router.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const sessionManager = require("../utils/sessionManager");
    const { username } = req.query;

    let sessions;
    if (username) {
      sessions = sessionManager.getUserSessions(username);
    } else {
      sessions = sessionManager.getAllActiveSessions();
    }

    const stats = sessionManager.getSessionStats();

    res.json({
      success: true,
      data: {
        sessions,
        stats,
      },
    });
  })
);

/**
 * Export logs to CSV
 * GET /api/logs/export/:type
 */
router.get(
  "/export/:type",
  asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { startDate, endDate, format = "csv" } = req.query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let logs = [];
    let filename = "";

    switch (type) {
      case "api":
        logs = await loggingService.getApiLogs(
          { startDate: start, endDate: end },
          { limit: 10000 }
        );
        filename = `api_logs_${start.toISOString().split("T")[0]}_to_${
          end.toISOString().split("T")[0]
        }.csv`;
        break;
      case "errors":
        logs = await loggingService.getErrorLogs(
          { startDate: start, endDate: end },
          { limit: 10000 }
        );
        filename = `error_logs_${start.toISOString().split("T")[0]}_to_${
          end.toISOString().split("T")[0]
        }.csv`;
        break;
      case "activities":
        logs = await loggingService.getUserActivities(
          { startDate: start, endDate: end },
          { limit: 10000 }
        );
        filename = `user_activities_${start.toISOString().split("T")[0]}_to_${
          end.toISOString().split("T")[0]
        }.csv`;
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            message: "Invalid export type. Must be api, errors, or activities",
            code: "VALIDATION_ERROR",
          },
        });
    }

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(logs);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: logs,
        count: logs.length,
        period: { startDate: start, endDate: end },
      });
    }
  })
);

/**
 * Convert array of objects to CSV format
 * @param {Array} data - Array of objects
 * @returns {string} CSV string
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return "";
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      if (value === null || value === undefined) {
        return "";
      }
      if (typeof value === "object") {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

module.exports = router;
