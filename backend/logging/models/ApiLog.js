const mongoose = require("mongoose");
const { truncatePayload } = require("../utils/logSanitizer");

const apiLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      // required: true,
      index: true,
    },
    username: {
      type: String,
      required: false,
      index: true,
    },
    userType: {
      type: String,
      required: false,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      // unique: true,
      // index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
      index: true,
    },
    endpoint: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
      index: true,
    },
    requestHeaders: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    responseStatus: {
      type: Number,
      required: true,
      index: true,
    },
    responseHeaders: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    responsePayload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    responseTime: {
      type: Number,
      required: true,
      index: true, // For performance analysis
    },
    errorDetails: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    success: {
      type: Boolean,
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "api_logs",
  }
);

// // Indexes for better query performance
// apiLogSchema.index({ username: 1, timestamp: -1 });
// apiLogSchema.index({ endpoint: 1, timestamp: -1 });
// apiLogSchema.index({ method: 1, timestamp: -1 });
// apiLogSchema.index({ responseStatus: 1, timestamp: -1 });
// apiLogSchema.index({ success: 1, timestamp: -1 });
// apiLogSchema.index({ responseTime: 1, timestamp: -1 });
// apiLogSchema.index({ sessionId: 1, timestamp: -1 });

// TTL index for automatic log cleanup (90 days by default)
// apiLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Pre-save middleware to update updatedAt
apiLogSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for common queries
apiLogSchema.statics.findByUsername = function (username, limit = 100) {
  return this.find({ username }).sort({ timestamp: -1 }).limit(limit);
};

apiLogSchema.statics.findByEndpoint = function (endpoint, limit = 100) {
  return this.find({ endpoint }).sort({ timestamp: -1 }).limit(limit);
};

apiLogSchema.statics.findErrors = function (limit = 100) {
  return this.find({ success: false }).sort({ timestamp: -1 }).limit(limit);
};

apiLogSchema.statics.getPerformanceStats = function (startDate, endDate) {
  return this.aggregate([
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
        _id: "$endpoint",
        avgResponseTime: { $avg: "$responseTime" },
        maxResponseTime: { $max: "$responseTime" },
        minResponseTime: { $min: "$responseTime" },
        totalRequests: { $sum: 1 },
        errorCount: {
          $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        errorRate: {
          $divide: ["$errorCount", "$totalRequests"],
        },
      },
    },
  ]);
};

apiLogSchema.pre("save", function (next) {
  if (this.requestPayload) {
    this.requestPayload = truncatePayload(this.requestPayload);
  }
  if (this.responsePayload) {
    this.responsePayload = truncatePayload(this.responsePayload);
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("ApiLog", apiLogSchema);
