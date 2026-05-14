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

    try {
      const pool = await dbConnection();

      const query = `
SELECT 
    p.urduname,
    p.category,
    p.company,
    SUM(ps.qty) AS qty
FROM psproduct ps
JOIN products p ON p.id = ps.prid
WHERE ps.EntryBy = 'danish'
  AND ps.date = @targetDate
GROUP BY 
    p.urduname,
    p.category,
    p.company
ORDER BY Company, urduname, category;
    `;

      const result = await pool
        .request()
        .input("targetDate", sql.Date, targetDate)
        .query(query);

      res.status(200).json({
        success: true,
        count: result.recordset.length,
        data: result.recordset,
      });
    } catch (err) {
      console.error("❌ Error fetching today's user product history:", err);
      res.status(500).json({
        success: false,
        message: "Server error while fetching product history",
        error: err.message,
      });
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
