const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorLogger");

/**
 * Receive frontend logs
 * POST /api/logs/frontend
 */
router.post(
  "/frontend",
  asyncHandler(async (req, res) => {
    try {
      const { logs, timestamp, userAgent, url, referrer } = req.body;

      if (!logs || !Array.isArray(logs)) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Logs array is required",
            code: "VALIDATION_ERROR",
          },
        });
      }
      const processedLogs = logs.map((log) => {
        const d = log.data || {};

        return {
          type: log.type || d.type,

          // 👇 correctly pull from `data`
          username: d.username,
          userType: d.userType,

          method: d.method,
          url: d.url,
          timestamp: d.timestamp
            ? new Date(d.timestamp)
            : new Date(log.timestamp),

          requestId: d.requestId,
          sessionId: d.sessionId,
          status: d.status,
          statusText: d.statusText,
          error: d.error,
          responseTime: d.responseTime,

          // frontend metadata
          frontendTimestamp: new Date(),
          frontendUserAgent: d.userAgent,
          frontendUrl: d.url,
          frontendReferrer: d.referrer,
          receivedAt: new Date(),
        };
      });

      // Store logs in database (you can create a separate collection for frontend logs)
      const FrontendLog = require("../models/FrontendLog");

      if (processedLogs.length > 0) {
        await FrontendLog.insertMany(processedLogs);
      }

      res.json({
        success: true,
        message: `Processed ${processedLogs.length} frontend logs`,
        count: processedLogs.length,
      });
    } catch (error) {
      console.error("❌ Error processing frontend logs:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to process frontend logs",
          code: "PROCESSING_ERROR",
        },
      });
    }
  })
);

/**
 * Get frontend logs
 * GET /api/logs/frontend
 */
router.get(
  "/frontend",
  asyncHandler(async (req, res) => {
    try {
      const {
        type,
        startDate,
        endDate,
        limit = 100,
        skip = 0,
        sort = "timestamp:-1",
      } = req.query;

      const query = {};

      if (type) query.type = type;
      if (startDate && endDate) {
        query.timestamp = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

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

      const FrontendLog = require("../models/FrontendLog");
      const logs = await FrontendLog.find(query)
        .sort(options.sort)
        .limit(options.limit)
        .skip(options.skip);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
        filters: { type, startDate, endDate },
        options,
      });
    } catch (error) {
      console.error("❌ Error getting frontend logs:", error);
      res.status(500).json({
        success: false,
        error: {
          message: "Failed to get frontend logs",
          code: "QUERY_ERROR",
        },
      });
    }
  })
);

module.exports = router;
