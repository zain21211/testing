const dbConnection = require("./database/connection");
const sql = require("mssql");

async function run() {
  try {
    const pool = await dbConnection();
    console.log("Connected successfully!");

    console.log("--- 1. Querying LocationTracking for 'TEST' ---");
    const lt = await pool.request()
      .input("username", sql.NVarChar, "TEST")
      .query("SELECT TOP 5 * FROM LocationTracking WHERE username = @username ORDER BY id DESC");
    console.dir(lt.recordset);

    console.log("--- 2. Querying Attendance for employee_id = 17 ---");
    const att = await pool.request()
      .query("SELECT * FROM Attendance WHERE employee_id = 17");
    console.dir(att.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
