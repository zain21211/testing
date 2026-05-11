const mongoose = require("mongoose");

const errorLogSchema = new mongoose.Schema(
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
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    errorType: {
      type: String,
      required: true,
      enum: [
        "API_ERROR",
        "VALIDATION_ERROR",
        "SYSTEM_ERROR",
        "DATABASE_ERROR",
        "AUTHENTICATION_ERROR",
        "AUTHORIZATION_ERROR",
        "NETWORK_ERROR",
        "CLIENT_ERROR",
      ],
      index: true,
    },
    errorCode: {
      type: String,
      required: false,
      index: true,
    },
    errorMessage: {
      type: String,
      required: true,
    },
    stackTrace: {
      type: String,
      required: false,
    },
    endpoint: {
      type: String,
      required: false,
      index: true,
    },
    requestPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    severity: {
      type: String,
      required: true,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
      index: true,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
      required: false,
    },
    resolvedBy: {
      type: String,
      required: false,
    },
    resolutionNotes: {
      type: String,
      required: false,
    },
    environment: {
      type: String,
      required: false,
      enum: ["development", "staging", "production"],
      default: "development",
    },
    additionalContext: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
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
    collection: "error_logs",
  }
);

// Indexes for better query performance
errorLogSchema.index({ username: 1, timestamp: -1 });
errorLogSchema.index({ errorType: 1, timestamp: -1 });
errorLogSchema.index({ severity: 1, timestamp: -1 });
errorLogSchema.index({ resolved: 1, timestamp: -1 });
errorLogSchema.index({ endpoint: 1, timestamp: -1 });
errorLogSchema.index({ errorCode: 1, timestamp: -1 });

// TTL index for automatic log cleanup (365 days by default)
errorLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 }
);

// Pre-save middleware to update updatedAt
errorLogSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Static methods for common queries
errorLogSchema.statics.findByUsername = function (username, limit = 100) {
  return this.find({ username }).sort({ timestamp: -1 }).limit(limit);
};

errorLogSchema.statics.findBySeverity = function (severity, limit = 100) {
  return this.find({ severity }).sort({ timestamp: -1 }).limit(limit);
};

errorLogSchema.statics.findUnresolved = function (limit = 100) {
  return this.find({ resolved: false }).sort({ timestamp: -1 }).limit(limit);
};

errorLogSchema.statics.findCriticalErrors = function (limit = 100) {
  return this.find({ severity: "CRITICAL" })
    .sort({ timestamp: -1 })
    .limit(limit);
};

errorLogSchema.statics.getErrorStats = function (startDate, endDate) {
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
        _id: {
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
        _id: "$_id.errorType",
        totalCount: { $sum: "$count" },
        resolvedCount: { $sum: "$resolvedCount" },
        severities: {
          $push: {
            severity: "$_id.severity",
            count: "$count",
          },
        },
      },
    },
    {
      $addFields: {
        resolutionRate: {
          $divide: ["$resolvedCount", "$totalCount"],
        },
      },
    },
  ]);
};

// Instance method to mark error as resolved
errorLogSchema.methods.markAsResolved = function (resolvedBy, notes) {
  this.resolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = resolvedBy;
  this.resolutionNotes = notes;
  return this.save();
};

module.exports = mongoose.model("ErrorLog", errorLogSchema);
