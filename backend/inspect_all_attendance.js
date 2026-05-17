const dbConnection = require("./database/connection");
const sql = require("mssql");

async function run() {
  try {
    const pool = await dbConnection();
    console.log("Connected successfully!");

    console.log("--- 1. Querying ALL rows in Attendance ---");
    const att = await pool.request().query("SELECT * FROM Attendance ORDER BY id DESC");
    console.dir(att.recordset);

    console.log("--- 2. Checking if 'TEST' name lookup matches employee table ---");
    const nameMatch = await pool.request()
      .input("username", sql.NVarChar, "TEST")
      .query("SELECT id, name FROM employee WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@username)))");
    console.dir(nameMatch.recordset);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
