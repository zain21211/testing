const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
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
    activity: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "CREATE_ORDER",
        "UPDATE_ORDER",
        "DELETE_ORDER",
        "VIEW_ORDER",
        "CREATE_CUSTOMER",
        "UPDATE_CUSTOMER",
        "DELETE_CUSTOMER",
        "VIEW_CUSTOMER",
        "CREATE_PRODUCT",
        "UPDATE_PRODUCT",
        "DELETE_PRODUCT",
        "VIEW_PRODUCT",
        "VIEW_REPORT",
        "EXPORT_DATA",
        "UPLOAD_FILE",
        "DOWNLOAD_FILE",
        "SEARCH",
        "FILTER",
        "SORT",
        "PAGINATION",
        "NAVIGATION",
        "SETTINGS_CHANGE",
        "PASSWORD_CHANGE",
        "PROFILE_UPDATE",
        "PERMISSION_CHANGE",
        "SYSTEM_ACCESS",
        "DATA_EXPORT",
        "DATA_IMPORT",
        "BACKUP_CREATE",
        "BACKUP_RESTORE",
        "OTHER",
      ],
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
      default: Date.now,
    },
    ipAddress: {
      type: String,
      required: false,
      index: true,
    },
    userAgent: {
      type: String,
      required: false,
    },
    success: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    duration: {
      type: Number,
      required: false, // Duration in milliseconds for activities that take time
    },
    resourceId: {
      type: String,
      required: false,
      index: true, // ID of the resource being acted upon (e.g., order ID, customer ID)
    },
    resourceType: {
      type: String,
      required: false,
      index: true, // Type of resource (e.g., 'order', 'customer', 'product')
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
  },
  {
    timestamps: true,
    collection: "user_activities",
  }
);

// Indexes for better query performance
userActivitySchema.index({ username: 1, timestamp: -1 });
userActivitySchema.index({ activity: 1, timestamp: -1 });
userActivitySchema.index({ userType: 1, timestamp: -1 });
userActivitySchema.index({ success: 1, timestamp: -1 });
userActivitySchema.index({ resourceType: 1, timestamp: -1 });
userActivitySchema.index({ resourceId: 1, timestamp: -1 });
userActivitySchema.index({ sessionId: 1, timestamp: -1 });

// TTL index for automatic log cleanup (90 days by default)
userActivitySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// Static methods for common queries
userActivitySchema.statics.findByUsername = function (username, limit = 100) {
  return this.find({ username }).sort({ timestamp: -1 }).limit(limit);
};

userActivitySchema.statics.findByActivity = function (activity, limit = 100) {
  return this.find({ activity }).sort({ timestamp: -1 }).limit(limit);
};

userActivitySchema.statics.findBySession = function (sessionId, limit = 100) {
  return this.find({ sessionId }).sort({ timestamp: -1 }).limit(limit);
};

userActivitySchema.statics.findFailedActivities = function (limit = 100) {
  return this.find({ success: false }).sort({ timestamp: -1 }).limit(limit);
};

userActivitySchema.statics.getUserActivityStats = function (
  startDate,
  endDate
) {
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
          username: "$username",
          activity: "$activity",
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
        },
        avgDuration: { $avg: "$duration" },
      },
    },
    {
      $group: {
        _id: "$_id.username",
        totalActivities: { $sum: "$count" },
        successRate: {
          $avg: { $divide: ["$successCount", "$count"] },
        },
        activities: {
          $push: {
            activity: "$_id.activity",
            count: "$count",
            successCount: "$successCount",
            avgDuration: "$avgDuration",
          },
        },
      },
    },
  ]);
};

userActivitySchema.statics.getActivityFrequency = function (
  startDate,
  endDate
) {
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
        _id: "$activity",
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: "$username" },
      },
    },
    {
      $addFields: {
        uniqueUserCount: { $size: "$uniqueUsers" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

// Instance method to calculate activity duration
userActivitySchema.methods.calculateDuration = function (startTime) {
  if (startTime) {
    this.duration = Date.now() - startTime.getTime();
  }
  return this;
};

module.exports = mongoose.model("UserActivity", userActivitySchema);
