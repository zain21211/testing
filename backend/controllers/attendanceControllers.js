const dbConnection = require("../database/connection");
const sql = require("mssql");

const attendanceControllers = {
  // Initialize Tables if not exists
  initTables: async (pool) => {
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Attendance' AND xtype='U')
      BEGIN
          CREATE TABLE Attendance (
              id INT IDENTITY(1,1) PRIMARY KEY,
              employee_id INT NOT NULL,
              attendance_date DATE NOT NULL,
              time_in VARCHAR(10),
              time_out VARCHAR(10),
              break_hours DECIMAL(4,2) DEFAULT 0,
              net_hours DECIMAL(4,2) DEFAULT 0,
              status NVARCHAR(50), -- Present, Late, Leave, Absent
              entry_by NVARCHAR(100),
              entry_at DATETIME DEFAULT GETDATE()
          );
      END

      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Holidays' AND xtype='U')
      BEGIN
          CREATE TABLE Holidays (
              holiday_date DATE PRIMARY KEY,
              description NVARCHAR(255)
          );
      END
    `;
    await pool.request().query(query);
  },

  getAttendanceData: async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const pool = await dbConnection();
      await attendanceControllers.initTables(pool);

      const query = `
        SELECT 
            e.id AS employee_id, e.name, e.designation,
            a.id AS attendance_id, a.attendance_date, a.time_in, a.time_out, a.break_hours, a.net_hours, a.status
        FROM employee e
        LEFT JOIN Attendance a ON a.employee_id = e.id AND a.attendance_date = @targetDate
        WHERE e.status = 'ACTIVE' OR e.status IS NULL
        ORDER BY e.id;
      `;

      const result = await pool.request()
        .input("targetDate", sql.Date, targetDate)
        .query(query);

      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  },

  saveAttendance: async (req, res) => {
    const { employee_id, date, time_in, time_out, break_hours, net_hours, status } = req.body;
    const entryBy = "Admin"; // Hardcoded for now

    try {
      const pool = await dbConnection();
      
      const query = `
        IF EXISTS (SELECT 1 FROM Attendance WHERE employee_id = @empId AND attendance_date = @date)
        BEGIN
            UPDATE Attendance 
            SET time_in = @timeIn, 
                time_out = @timeOut, 
                break_hours = @breakHours, 
                net_hours = @netHours, 
                status = @status,
                entry_by = @entryBy,
                entry_at = GETDATE()
            WHERE employee_id = @empId AND attendance_date = @date
        END
        ELSE
        BEGIN
            INSERT INTO Attendance (employee_id, attendance_date, time_in, time_out, break_hours, net_hours, status, entry_by)
            VALUES (@empId, @date, @timeIn, @timeOut, @breakHours, @netHours, @status, @entryBy)
        END
      `;

      await pool.request()
        .input("empId", sql.Int, employee_id)
        .input("date", sql.Date, date)
        .input("timeIn", sql.VarChar, time_in || null)
        .input("timeOut", sql.VarChar, time_out || null)
        .input("breakHours", sql.Decimal(4,2), break_hours || 0)
        .input("netHours", sql.Decimal(4,2), net_hours || 0)
        .input("status", sql.NVarChar, status || null)
        .input("entryBy", sql.NVarChar, entryBy)
        .query(query);

      res.json({ success: true, message: "Attendance saved" });
    } catch (error) {
      console.error("Error saving attendance:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  },

  toggleHoliday: async (req, res) => {
    const { date, description } = req.body;
    if (!date) return res.status(400).json({ success: false, message: "Date is required" });

    try {
      const pool = await dbConnection();
      await attendanceControllers.initTables(pool);

      const checkQuery = `SELECT 1 FROM Holidays WHERE holiday_date = @date`;
      const result = await pool.request().input("date", sql.Date, date).query(checkQuery);

      if (result.recordset.length > 0) {
        // Exists, remove it
        await pool.request().input("date", sql.Date, date).query(`DELETE FROM Holidays WHERE holiday_date = @date`);
        res.json({ success: true, message: "Holiday removed", isHoliday: false });
      } else {
        // Doesn't exist, add it
        await pool.request()
          .input("date", sql.Date, date)
          .input("description", sql.NVarChar, description || "Global Holiday")
          .query(`INSERT INTO Holidays (holiday_date, description) VALUES (@date, @description)`);
        res.json({ success: true, message: "Holiday added", isHoliday: true });
      }
    } catch (error) {
      console.error("Error toggling holiday:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  },

  checkHoliday: async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: "Date is required" });

    try {
      const pool = await dbConnection();
      await attendanceControllers.initTables(pool);
      const checkQuery = `SELECT 1 FROM Holidays WHERE holiday_date = @date`;
      const result = await pool.request().input("date", sql.Date, date).query(checkQuery);
      res.json({ success: true, isHoliday: result.recordset.length > 0 });
    } catch (error) {
      console.error("Error checking holiday:", error);
      res.status(500).json({ success: false, message: "Database error" });
    }
  },

  getMonthlyAttendance: async (req, res) => {
    const { month, year } = req.query; // e.g., month = 5, year = 2026

    if (!month || !year) {
      return res.status(400).json({ success: false, message: "Month and year are required." });
    }

    try {
      const pool = await dbConnection();
      await attendanceControllers.initTables(pool);

      // 1. Get all active employees
      const empResult = await pool.request().query("SELECT id, name, designation FROM employee WHERE status = 'ACTIVE' OR status IS NULL ORDER BY name ASC");
      const employees = empResult.recordset;

      // 2. Get all attendance records for the month
      const attendanceQuery = `
        SELECT employee_id, attendance_date, status, time_in, time_out
        FROM Attendance
        WHERE MONTH(attendance_date) = @month AND YEAR(attendance_date) = @year
      `;
      const attResult = await pool.request()
        .input("month", sql.Int, month)
        .input("year", sql.Int, year)
        .query(attendanceQuery);
      const records = attResult.recordset;

      // 3. Get all holidays for the month
      const holidayQuery = `
        SELECT holiday_date, description 
        FROM Holidays 
        WHERE MONTH(holiday_date) = @month AND YEAR(holiday_date) = @year
      `;
      const holResult = await pool.request()
        .input("month", sql.Int, month)
        .input("year", sql.Int, year)
        .query(holidayQuery);
      const holidays = holResult.recordset;

      res.json({
        success: true,
        data: {
          employees,
          records,
          holidays
        }
      });
    } catch (error) {
      console.error("Error fetching monthly attendance:", error);
      res.status(500).json({ success: false, message: "Database error", error: error.message });
    }
  }
};

module.exports = attendanceControllers;
