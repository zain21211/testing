const dbConnection = require("../database/connection");
const sql = require("mssql");
const https = require("https");

// ─── Table Init ──────────────────────────────────────────────────────────────
const initTrackingTable = async (pool) => {
  const query = `
    -- LocationTracking table
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LocationTracking' AND xtype='U')
    BEGIN
        CREATE TABLE LocationTracking (
            id            INT IDENTITY(1,1) PRIMARY KEY,
            username      NVARCHAR(100) NOT NULL,
            user_type     NVARCHAR(50),
            latitude      DECIMAL(10,7) NOT NULL,
            longitude     DECIMAL(10,7) NOT NULL,
            location_name NVARCHAR(500),
            accuracy      DECIMAL(8,2),
            ping_type     NVARCHAR(20) DEFAULT 'auto',
            recorded_at   DATETIME DEFAULT GETDATE()
        );
        CREATE INDEX IX_LocationTracking_user_date
            ON LocationTracking (username, recorded_at);
    END

    -- Add location columns to Attendance if they don't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='Attendance' AND COLUMN_NAME='checkin_lat')
    BEGIN
        ALTER TABLE Attendance ADD checkin_lat DECIMAL(10,7);
        ALTER TABLE Attendance ADD checkin_lng DECIMAL(10,7);
        ALTER TABLE Attendance ADD checkin_location NVARCHAR(500);
    END
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME='Attendance' AND COLUMN_NAME='checkout_lat')
    BEGIN
        ALTER TABLE Attendance ADD checkout_lat DECIMAL(10,7);
        ALTER TABLE Attendance ADD checkout_lng DECIMAL(10,7);
        ALTER TABLE Attendance ADD checkout_location NVARCHAR(500);
    END
  `;
  await pool.request().query(query);
};

const reverseGeocode = (lat, lng) => {
  return new Promise((resolve) => {
    // Using zoom=16 to get a better balance of street/neighborhood info
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=en`;
    const options = {
      headers: { "User-Agent": "AhmadInternationalSMS/1.0 (internal-tracking)" },
      timeout: 10000, // 10 second timeout
    };

    const req = https.get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            const a = parsed.address || {};
            
            const specific = a.shop || a.amenity || a.building || a.office || a.house_name || a.landmark || a.commercial || a.industrial || a.leisure || a.theatre || a.bank || a.restaurant;
            const street   = a.road || a.pedestrian || a.path || a.street || a.highway || a.footway;
            const area     = a.neighbourhood || a.suburb || a.residential || a.quarter || a.locality || a.hamlet || a.allotments;
            const city     = a.city_district || a.town || a.village || a.city;

            const parts = [specific, street, area, city].filter(Boolean);

            if (parts.length >= 2) {
                resolve(parts.join(", "));
            } else {
                const fallback = (parsed.display_name || "").split(", ")
                    .filter(p => !["Pakistan", "Punjab", "Division", "District", "Tehsil", "پاکستان", "پنجاب", "ڈویژن", "ضلع", "تحصیل"].some(b => p.includes(b)))
                    .filter(p => !/^\d+$/.test(p.trim().replace(/-/g, "")))
                    .slice(0, 3)
                    .join(", ");
                
                resolve(fallback || parsed.display_name || `${lat},${lng}`);
            }
          } catch {
            resolve(`${lat},${lng}`);
          }
        });
      });

    req.on("error", () => resolve(`${lat},${lng}`));
    req.on("timeout", () => {
        req.destroy();
        resolve(`${lat},${lng}`);
    });
  });
};

// ─── Controllers ─────────────────────────────────────────────────────────────
const trackingController = {
  /**
   * POST /api/tracking/ping
   * Body: { username, userType, latitude, longitude, accuracy, pingType }
   * Saves a location ping.  On the first ping of the day also updates Attendance.
   */
  locationPing: async (req, res) => {
    const { username, userType, latitude, longitude, accuracy, pingType = "auto", timestamp } = req.body;

    if (!username || latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: "username, latitude, longitude required" });
    }

    try {
      const pool = await dbConnection();
      await initTrackingTable(pool);

      const today = new Date().toISOString().split("T")[0];
      const now   = new Date();

      // 1. Respond IMMEDIATELY to the user
      res.json({ success: true, message: "Attendance captured" });

      // 2. Perform database work and geocoding in the background
      (async () => {
        try {
          // Insert initial ping with coordinates as location fallback
          const initialLoc = `${latitude}, ${longitude}`;
          const insertRes = await pool
            .request()
            .input("username", sql.NVarChar, username)
            .input("userType", sql.NVarChar, userType || "")
            .input("lat", sql.Decimal(10, 7), parseFloat(latitude))
            .input("lng", sql.Decimal(10, 7), parseFloat(longitude))
            .input("locName", sql.NVarChar, initialLoc)
            .input("accuracy", sql.Decimal(8, 2), parseFloat(accuracy) || null)
            .input("pingType", sql.NVarChar, pingType)
            .input("recordedAt", sql.DateTime, timestamp ? new Date(timestamp) : new Date())
            .query(`
              INSERT INTO LocationTracking (username, user_type, latitude, longitude, location_name, accuracy, ping_type, recorded_at)
              OUTPUT INSERTED.id
              VALUES (@username, @userType, @lat, @lng, @locName, @accuracy, @pingType, @recordedAt)
            `);
          
          const pingId = insertRes.recordset[0].id;

          // UPSERT Attendance (Instant)
          await pool.request()
            .input("username", sql.NVarChar, username)
            .input("today", sql.Date, today)
            .input("lat", sql.Decimal(10, 7), parseFloat(latitude))
            .input("lng", sql.Decimal(10, 7), parseFloat(longitude))
            .input("locName", sql.NVarChar, initialLoc)
            .query(`
              DECLARE @empId INT;
              SELECT @empId = id FROM employee WHERE LOWER(LTRIM(RTRIM(name))) = LOWER(LTRIM(RTRIM(@username)));
              IF @empId IS NOT NULL
              BEGIN
                  IF @pingType = 'checkout'
                  BEGIN
                      UPDATE Attendance SET
                        checkout_lat = @lat,
                        checkout_lng = @lng,
                        checkout_location = @locName,
                        time_out = CONVERT(VARCHAR(5), GETDATE(), 108)
                      WHERE employee_id = @empId AND attendance_date = @today;
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
                      END
                      ELSE
                      BEGIN
                          INSERT INTO Attendance (employee_id, attendance_date, time_in, status, entry_by, checkin_lat, checkin_lng, checkin_location)
                          VALUES (@empId, @today, CONVERT(VARCHAR(5), GETDATE(), 108), 'Present', @username, @lat, @lng, @locName);
                      END
                  END
              END
            `);

          // 3. Reverse Geocode (Slow part) - run in background
          const realLocation = await reverseGeocode(latitude, longitude);

          // 4. Update with real names if they differ from coordinates
          if (realLocation && realLocation !== initialLoc) {
              await pool.request()
                .input("id", sql.Int, pingId)
                .input("loc", sql.NVarChar, realLocation)
                .query("UPDATE LocationTracking SET location_name = @loc WHERE id = @id");

              await pool.request()
                .input("username", sql.NVarChar, username)
                .input("today", sql.Date, today)
                .input("loc", sql.NVarChar, realLocation)
                .input("pingType", sql.NVarChar, pingType)
                .query(`
                  IF @pingType = 'checkout'
                  BEGIN
                      UPDATE a SET a.checkout_location = @loc
                      FROM Attendance a INNER JOIN employee e ON e.id = a.employee_id
                      WHERE LOWER(LTRIM(RTRIM(e.name))) = LOWER(LTRIM(RTRIM(@username))) AND a.attendance_date = @today
                  END
                  ELSE
                  BEGIN
                      UPDATE a SET a.checkin_location = @loc
                      FROM Attendance a INNER JOIN employee e ON e.id = a.employee_id
                      WHERE LOWER(LTRIM(RTRIM(e.name))) = LOWER(LTRIM(RTRIM(@username))) AND a.attendance_date = @today
                  END
                `);
          }
        } catch (bgErr) {
          console.error("Background tracking error:", bgErr);
        }
      })();

    } catch (error) {
      console.error("Tracking ping error:", error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: error.message });
      }
    }
  },

  /**
   * GET /api/tracking/history
   * Query: { username, date }   date = YYYY-MM-DD
   * Returns all pings for that user/day ordered by time.
   */
  getLocationHistory: async (req, res) => {
    const { username, date } = req.query;
    if (!username || !date) {
      return res.status(400).json({ success: false, message: "username and date required" });
    }

    try {
      const pool = await dbConnection();
      await initTrackingTable(pool);

      const result = await pool
        .request()
        .input("username", sql.NVarChar, username)
        .input("date", sql.Date, date)
        .query(`
          SELECT id, username, user_type, latitude, longitude, location_name,
                 accuracy, ping_type, recorded_at
          FROM LocationTracking
          WHERE username = @username
            AND CONVERT(DATE, recorded_at) = @date
          ORDER BY recorded_at ASC
        `);

      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("History error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/tracking/live
   * Returns the LATEST ping per user for today (to show live positions on map).
   */
  getLiveLocations: async (req, res) => {
    try {
      const pool = await dbConnection();
      await initTrackingTable(pool);

      const today = new Date().toISOString().split("T")[0];

      const result = await pool.request()
        .input("today", sql.Date, today)
        .query(`
        SELECT t.username, t.user_type, t.latitude, t.longitude,
               t.location_name, t.accuracy, t.recorded_at
        FROM LocationTracking t
        INNER JOIN (
          SELECT username, MAX(recorded_at) AS max_time
          FROM LocationTracking
          WHERE CONVERT(DATE, recorded_at) = @today
          GROUP BY username
        ) latest ON t.username = latest.username AND t.recorded_at = latest.max_time
        ORDER BY t.recorded_at DESC
      `);

      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Live locations error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },

  /**
   * GET /api/tracking/users
   * Query: { date }   → returns distinct usernames tracked on that date
   */
  getTrackingUsers: async (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    try {
      const pool = await dbConnection();
      await initTrackingTable(pool);

      const result = await pool
        .request()
        .input("date", sql.Date, targetDate)
        .query(`
          SELECT DISTINCT username, user_type,
                 MIN(recorded_at) AS first_seen,
                 MAX(recorded_at) AS last_seen,
                 COUNT(*)         AS ping_count
          FROM LocationTracking
          WHERE CONVERT(DATE, recorded_at) = @date
          GROUP BY username, user_type
          ORDER BY username
        `);

      res.json({ success: true, data: result.recordset });
    } catch (error) {
      console.error("Users error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  },
};

module.exports = trackingController;
