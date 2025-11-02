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
    // const { username } = req.params; // e.g., /api/history/danish
    const username = "danish";

    try {
      // Ensure DB is connected
      const pool = await dbConnection();

      const query = `
SELECT 
    p.urduname,
    p.category,
    p.company,
    SUM(ps.qty) AS qty
FROM psproduct ps
JOIN products p ON p.id = ps.prid
JOIN PSdetailHistory d ON d.doc = ps.doc
WHERE d.username = @username
  AND ps.date = CAST(GETDATE() AS date)
GROUP BY 
    p.urduname,
    p.category,
    p.company;

    `;

      const result = await pool
        .request()
        .input("username", sql.VarChar, username)
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
};

module.exports = productControllers;
