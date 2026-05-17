const dbConnection = require("./database/connection");
const sql = require("mssql");

async function run() {
  try {
    const pool = await dbConnection();
    console.log("Connected successfully!");

    console.log("--- Querying Top 15 records in Attendance ---");
    const result = await pool.request()
      .query("SELECT TOP 15 id, employee_id, attendance_date, time_in, time_out, status, entry_by, entry_at FROM Attendance ORDER BY id DESC");
    console.dir(result.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
