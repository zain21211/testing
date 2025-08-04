const mssql = require("mssql");
const dbConfig = require("./config");

let pool;

const dbConnection = async () => {
  if (pool) {
    // Ensure pool is connected and not closing
    if (pool.connected) return pool;
    if (!pool.connecting) {
      // Try reconnecting if it's not already trying
      pool = await mssql.connect(dbConfig);
      console.log("♻️ Reconnected to database");
      return pool;
    }
    // If still connecting, wait for it to finish
    await pool.connecting;
    return pool;
  }

  // First-time connection
  pool = await mssql.connect(dbConfig);
  console.log("✅ Initial database connection established");
  return pool;
};

module.exports = dbConnection;
