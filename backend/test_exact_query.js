const dbConnection = require("./database/connection");
const sql = require("mssql");

async function run() {
  try {
    const pool = await dbConnection();
    console.log("Connected successfully!");

    const username = "TEST";
    const today = new Date().toISOString().split("T")[0];
    const latitude = 31.4732387;
    const longitude = 73.0876782;
    const initialLoc = `${latitude}, ${longitude}`;
    const pingType = "checkin";

    console.log("--- Running target check-in query ---");
    const result = await pool.request()
      .input("username", sql.NVarChar, username)
      .input("today", sql.Date, today)
      .input("lat", sql.Decimal(10, 7), parseFloat(latitude))
      .input("lng", sql.Decimal(10, 7), parseFloat(longitude))
      .input("locName", sql.NVarChar, initialLoc)
      .input("pingType", sql.NVarChar, pingType)
      .query(`
        DECLARE @empId INT;
        SELECT @empId = id FROM employee WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@username)));
        
        SELECT @empId as foundEmpId;
        
        IF @empId IS NOT NULL
        BEGIN
            PRINT 'Employee found: ' + CAST(@empId AS VARCHAR);
            IF @pingType = 'checkout'
            BEGIN
                UPDATE Attendance SET
                  checkout_lat = @lat,
                  checkout_lng = @lng,
                  checkout_location = @locName,
                  time_out = CONVERT(VARCHAR(5), GETDATE(), 108)
                WHERE employee_id = @empId AND attendance_date = @today;
                SELECT 'Checked out' as action;
            END
            ELSE
            BEGIN
                IF EXISTS (SELECT 1 FROM Attendance WHERE employee_id = @empId AND attendance_date = @today)
                BEGIN
                    UPDATE Attendance SET
                      checkin_lat = COALESCE(checkin_lat, @lat),
                      checkin_lng = COALESCE(checkin_lng, @lng),
                      checkin_location = COALESCE(checkin_location, @locName),
                      time_in = COALESCE(time_in, CONVERT(VARCHAR(5), GETDATE(), 108)),
                      status = COALESCE(status, 'Present'),
                      entry_by = COALESCE(entry_by, @username)
                    WHERE employee_id = @empId AND attendance_date = @today;
                    SELECT 'Updated checkin' as action;
                END
                ELSE
                BEGIN
                    INSERT INTO Attendance (employee_id, attendance_date, time_in, status, entry_by, checkin_lat, checkin_lng, checkin_location)
                    VALUES (@empId, @today, CONVERT(VARCHAR(5), GETDATE(), 108), 'Present', @username, @lat, @lng, @locName);
                    SELECT 'Inserted checkin' as action;
                END
            END
        END
        ELSE
        BEGIN
            SELECT 'Employee NOT found' as action;
        END
      `);
    
    console.log("SQL Results:");
    console.dir(result.recordset);
    if (result.recordsets) {
      console.log("All recordsets:");
      console.dir(result.recordsets);
    }

    console.log("--- Querying Attendance table for employee_id = 17 ---");
    const att = await pool.request().query("SELECT * FROM Attendance WHERE employee_id = 17");
    console.dir(att.recordset);

    process.exit(0);
  } catch (err) {
    console.error("SQL CRASHED:", err);
    process.exit(1);
  }
}
run();
