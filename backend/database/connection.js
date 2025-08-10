const mssql = require("mssql");
const dbConfig = require("./config");

let pool;

const dbConnection = async () => {
  try {
    if (pool) {
      if (pool.connected) return pool;
      if (pool.connecting) {
        // Wait until connection is established
        await pool.connecting;
        return pool;
      }
    }

    // First time or reconnecting
    pool = await new mssql.ConnectionPool(dbConfig).connect();
    console.log("✅ Database connection established");
    return pool;
  } catch (err) {
    console.error("❌ DB connection error:", err);
    throw err;
  }
};

module.exports = dbConnection;
