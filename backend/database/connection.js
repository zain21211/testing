const mssql = require("mssql");
const dbConfig = require("./config");

let poolPromise = null;

const dbConnection = async () => {
  try {
    if (!poolPromise) {
      // Create and store the connection promise (only once)
      poolPromise = new mssql.ConnectionPool(dbConfig)
        .connect()
        .then((pool) => {
          console.log("✅ Database connection established");
          return pool;
        })
        .catch((err) => {
          console.error("❌ Database connection failed:", err);
          poolPromise = null; // reset on failure
          throw err;
        });
    }

    // Always await the same promise
    return await poolPromise;
  } catch (err) {
    console.error("❌ DB connection error:", err);
    throw err;
  }
};

module.exports = dbConnection;
