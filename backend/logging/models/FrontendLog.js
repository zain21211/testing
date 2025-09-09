const mongoose = require("mongoose");

const frontendLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      // enum: [
      //   "request",
      //   "response",
      //   "request_error",
      //   "response_error",
      //   "user_activity",
      //   "frontend_error",
      // ],
      index: true,
    },
    username: {
      type: String,
    },
    userType: {
      type: String,
    },
    requestId: {
      type: String,
      required: false,
      index: true,
    },
    sessionId: {
      type: String,
      // required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    method: {
      type: String,
      required: false,
      index: true,
    },
    url: {
      type: String,
      required: false,
    },
    fullURL: {
      type: String,
      required: false,
    },
    status: {
      type: Number,
      required: false,
      index: true,
    },
    statusText: {
      type: String,
      required: false,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    responseTime: {
      type: Number,
      required: false,
      index: true,
    },
    success: {
      type: Boolean,
      required: false,
      index: true,
    },
    error: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    activity: {
      type: String,
      required: false,
      index: true,
    },
    description: {
      type: String,
      required: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    frontendTimestamp: {
      type: String,
      required: false,
    },
    frontendUserAgent: {
      type: String,
      required: false,
    },
    frontendUrl: {
      type: String,
      required: false,
    },
    frontendReferrer: {
      type: String,
      required: false,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "frontend_logs",
  }
);

// Indexes for better query performance
frontendLogSchema.index({ sessionId: 1, timestamp: -1 });
frontendLogSchema.index({ type: 1, timestamp: -1 });
frontendLogSchema.index({ success: 1, timestamp: -1 });
frontendLogSchema.index({ activity: 1, timestamp: -1 });
frontendLogSchema.index({ status: 1, timestamp: -1 });

// TTL index for automatic log cleanup (30 days by default)
frontendLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 }
);

// Static methods for common queries
frontendLogSchema.statics.findBySession = function (sessionId, limit = 100) {
  return this.find({ sessionId }).sort({ timestamp: -1 }).limit(limit);
};

frontendLogSchema.statics.findByType = function (type, limit = 100) {
  return this.find({ type }).sort({ timestamp: -1 }).limit(limit);
};

frontendLogSchema.statics.findErrors = function (limit = 100) {
  return this.find({
    $or: [
      { type: "request_error" },
      { type: "response_error" },
      { type: "frontend_error" },
    ],
  })
    .sort({ timestamp: -1 })
    .limit(limit);
};

frontendLogSchema.statics.getFrontendStats = function (startDate, endDate) {
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
        _id: "$type",
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        errorCount: {
          $sum: {
            $cond: [
              {
                $in: [
                  "$type",
                  ["request_error", "response_error", "frontend_error"],
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: "$count" },
        totalErrors: { $sum: "$errorCount" },
        avgResponseTime: { $avg: "$avgResponseTime" },
        types: {
          $push: {
            type: "$_id",
            count: "$count",
            errorCount: "$errorCount",
            avgResponseTime: "$avgResponseTime",
          },
        },
      },
    },
    {
      $addFields: {
        errorRate: {
          $divide: ["$totalErrors", "$totalLogs"],
        },
      },
    },
  ]);
};

module.exports = mongoose.model("FrontendLog", frontendLogSchema);
