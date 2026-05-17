const dbConnection = require("./database/connection");
const sql = require("mssql");

async function run() {
  try {
    const pool = await dbConnection();
    console.log("Connected successfully!");

    console.log("--- 1. Top 5 LocationTracking pings ---");
    const lt = await pool.request()
      .query("SELECT TOP 5 * FROM LocationTracking ORDER BY id DESC");
    console.dir(lt.recordset);

    console.log("--- 2. Checking if 'TEST' exists in USERS or employee table ---");
    const users = await pool.request()
      .query("SELECT * FROM USERS WHERE LOWER(username) = 'test'");
    console.dir(users.recordset);

    const emp = await pool.request()
      .query("SELECT * FROM employee WHERE LOWER(name) = 'test'");
    console.dir(emp.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
