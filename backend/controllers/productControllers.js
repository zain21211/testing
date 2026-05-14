const dbConnection = require("../database/connection");
const sql = require("mssql");

const productControllers = {
  getProducts: async (req, res) => {
    try {
      pool = await dbConnection();
      const result = await pool.request().query(`
  SELECT *
  FROM Products
  ORDER BY Name;
`);
      res.json(result.recordset);
    } catch (error) {
      res
        .status(500)
        .json({ message: "Failed to fetch products this is new!.", error });
    }
  },

  // Controller: Get today's product history for a given username
  getProductsHistory: async (req, res) => {
    const { date } = req.query; // Expecting YYYY-MM-DD
    const targetDate = date || new Date().toISOString().split('T')[0];

    const runQuery = async (pool) => {
      const query = `
        SELECT 
            p.urduname,
            p.category,
            p.company,
            SUM(ps.qty) AS qty,
            MAX(sa.actual_qty) as actual_qty,
            MAX(sa.processed_load_qty) as processed_load_qty
        FROM psproduct ps
        JOIN products p ON p.id = ps.prid
        LEFT JOIN SpotSaleActuals sa ON 
            sa.entry_date = ps.date AND 
            sa.entry_by = ps.EntryBy AND 
            sa.company = p.company AND 
            sa.urduname = p.urduname AND 
            sa.category = p.category
        WHERE ps.EntryBy = 'danish'
          AND ps.date = @targetDate
        GROUP BY 
            p.urduname,
            p.category,
            p.company
        ORDER BY Company, urduname, category;
      `;
      return await pool.request().input("targetDate", sql.Date, targetDate).query(query);
    };

    try {
      const pool = await dbConnection();
      try {
        const result = await runQuery(pool);
        return res.status(200).json({ success: true, count: result.recordset.length, data: result.recordset });
      } catch (innerErr) {
        // Self-healing: If table or column is missing
        if (innerErr.message.includes("Invalid object name 'SpotSaleActuals'") || innerErr.message.includes("Invalid column name 'processed_load_qty'")) {
          console.log("Self-healing: Initializing SpotSaleActuals table/columns...");
          await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SpotSaleActuals' AND xtype='U')
            BEGIN
                CREATE TABLE SpotSaleActuals (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    entry_date DATE NOT NULL,
                    entry_by VARCHAR(50) NOT NULL,
                    company VARCHAR(255),
                    urduname NVARCHAR(255),
                    category VARCHAR(255),
                    actual_qty INT,
                    processed_load_qty INT
                )
            END
            ELSE IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SpotSaleActuals') AND name = 'processed_load_qty')
            BEGIN
                ALTER TABLE SpotSaleActuals ADD processed_load_qty INT
            END
          `);
          // Retry once
          const result = await runQuery(pool);
          return res.status(200).json({ success: true, count: result.recordset.length, data: result.recordset });
        }
        throw innerErr; // Rethrow if it's a different error
      }
    } catch (err) {
      console.error("❌ Error fetching product history:", err);
      res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
  },

  saveSpotSaleActual: async (req, res) => {
    const { date, company, urduname, category, qty, loadQty } = req.body;
    const entryBy = "danish";

    try {
      const pool = await dbConnection();
      const query = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SpotSaleActuals' AND xtype='U')
        BEGIN
            CREATE TABLE SpotSaleActuals (
                id INT IDENTITY(1,1) PRIMARY KEY,
                entry_date DATE NOT NULL,
                entry_by VARCHAR(50) NOT NULL,
                company VARCHAR(255),
                urduname NVARCHAR(255),
                category VARCHAR(255),
                actual_qty INT,
                processed_load_qty INT
            )
        END
        ELSE
        BEGIN
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SpotSaleActuals') AND name = 'processed_load_qty')
            BEGIN
                ALTER TABLE SpotSaleActuals ADD processed_load_qty INT
            END
        END

        IF EXISTS (SELECT 1 FROM SpotSaleActuals WHERE entry_date = @date AND entry_by = @entryBy AND company = @company AND urduname = @urduname AND category = @category)
        BEGIN
            UPDATE SpotSaleActuals SET actual_qty = @qty, processed_load_qty = @loadQty
            WHERE entry_date = @date AND entry_by = @entryBy AND company = @company AND urduname = @urduname AND category = @category
        END
        ELSE
        BEGIN
            INSERT INTO SpotSaleActuals (entry_date, entry_by, company, urduname, category, actual_qty, processed_load_qty)
            VALUES (@date, @entryBy, @company, @urduname, @category, @qty, @loadQty)
        END
      `;

      await pool.request()
        .input("date", sql.Date, date)
        .input("entryBy", sql.VarChar, entryBy)
        .input("company", sql.VarChar, company)
        .input("urduname", sql.NVarChar, urduname)
        .input("category", sql.VarChar, category)
        .input("qty", sql.Int, qty)
        .input("loadQty", sql.Int, loadQty)
        .query(query);

      res.json({ success: true, message: "Actual quantity saved" });
    } catch (err) {
      console.error("Error saving actual qty:", err);
      res.status(500).json({ success: false, message: "Database error", error: err.message });
    }
  },

  getCompanies: async (req, res) => {
    try {
      const pool = await dbConnection();
      const result = await pool.request().query("SELECT DISTINCT Company FROM Products WHERE Company IS NOT NULL AND Company <> '' ORDER BY Company");
      res.json(result.recordset.map(row => row.Company));
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies.", error });
    }
  },
};

module.exports = productControllers;
