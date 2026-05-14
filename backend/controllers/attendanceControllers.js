const dbConnection = require("../database/connection");
const sql = require("mssql");

const attendanceControllers = {
  // Initialize Tables if not exists
  initTables: async (pool) => {
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
      BEGIN
          CREATE TABLE Employees (
              id INT IDENTITY(1,1) PRIMARY KEY,
              name NVARCHAR(255) NOT NULL,
              designation NVARCHAR(100),
              is_active BIT DEFAULT 1
          );
          -- Seed data
          INSERT INTO Employees (name) VALUES 
          ('HAMZA'), ('HASSAN'), ('GULL REHMAN'), ('AHSEN'), 
          ('SUBHAN'), ('SAIM'), ('ABDUL REHMAN'), ('ZAHID'), 
          ('ZESHAN'), ('FAKHAR'), ('GOHAR'), ('GORAV'), 
          ('ARIF'), ('SALMAN'), ('DANISH'), ('ASAD');
      END

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
    `;
    await pool.request().query(query);
  },

  getAttendanceData: async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    try {
      const pool = await dbConnection();
      await attendanceControllers.initTables(pool);

      // Simple sync logic
      const syncNames = ['HAMZA', 'HASSAN', 'GULL REHMAN', 'AHSEN', 'SUBHAN', 'SAIM', 'ABDUL REHMAN', 'ZAHID', 'ZESHAN', 'FAKHAR', 'GOHAR', 'GORAV', 'ARIF', 'SALMAN', 'DANISH', 'ASAD'];
      for (const name of syncNames) {
        await pool.request().input("n", sql.NVarChar, name).query("IF NOT EXISTS(SELECT 1 FROM Employees WHERE name=@n) INSERT INTO Employees(name) VALUES(@n)");
      }

      const query = `
        SELECT 
            e.id AS employee_id, e.name, e.designation,
            a.id AS attendance_id, a.attendance_date, a.time_in, a.time_out, a.break_hours, a.net_hours, a.status
        FROM Employees e
        LEFT JOIN Attendance a ON a.employee_id = e.id AND a.attendance_date = @targetDate
        WHERE e.is_active = 1
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
  }
};

module.exports = attendanceControllers;
