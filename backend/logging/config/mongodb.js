require("dotenv").config();
const mongoose = require("mongoose");

const mongoConfig = {
  uri:
    process.env.MONGODB_URI ||
    "mongodb://localhost:27017/ahmadinternational-logs",
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  },
};

let isConnected = false;

const connectMongoDB = async () => {
  try {
    if (isConnected) {
      console.log("✅ MongoDB already connected");
      return;
    }

    await mongoose.connect(mongoConfig.uri, mongoConfig.options);
    isConnected = true;
    console.log("✅ MongoDB connection established for logging");

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
      isConnected = false;
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected");
      isConnected = true;
    });
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    isConnected = false;
    throw error;
  }
};

const disconnectMongoDB = async () => {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      isConnected = false;
      console.log("✅ MongoDB disconnected");
    }
  } catch (error) {
    console.error("❌ Error disconnecting MongoDB:", error);
  }
};

const getConnectionStatus = () => isConnected;

module.exports = {
  connectMongoDB,
  disconnectMongoDB,
  getConnectionStatus,
  mongoConfig,
};
