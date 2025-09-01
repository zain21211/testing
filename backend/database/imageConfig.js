require("dotenv").config();

const dbConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.IMAGEDB_NAME,
  port: parseInt(process.env.DB_PORT || "1433"), // default fallback
  connectionTimeout: 30000,
  requestTimeout: 30000,
  options: {
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 1,
    idleTimeoutMillis: 60000, // 1 min
  },
};

module.exports = dbConfig;
