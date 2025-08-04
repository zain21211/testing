// controllers/coaController.js
const sql = require("mssql");
const connection = require("../database/connection"); // adjust path to your config

const CoaController = {
  getRecentCOA: async (req, res) => {
    try {
      const { route } = req.query;
      const pool = await connection();

      const result = await pool
        .request()
        .input("route", sql.VarChar, `${route}%`).query(`
        SELECT 
          a.id,
          a.ROUTE, 
          ISNULL(a.RNO, 0) AS RNO, 
          a.Subsidary, 
          a.URDUNAME, 
          a.SPO
        FROM COA a
        CROSS APPLY (
          SELECT TOP 1 l.date 
          FROM Ledgers l 
          WHERE l.acid = a.id 
          ORDER BY l.date DESC
        ) latest
        WHERE 
          a.ROUTE LIKE @route
          AND latest.date > '2024-01-01'
        ORDER BY a.route,a.RNO, a.Subsidary;
      `);

      res.status(200).json(result.recordset);
    } catch (error) {
      console.error("SQL Error:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  },
  updateRNO: async (req, res) => {
    try {
      const { list } = req.body; // Use req.body, not req.query for arrays
      const pool = await connection();

      for (const item of list) {
        const { id, rno } = item;

        await pool
          .request()
          .input("rno", sql.Int, rno)
          .input("id", sql.VarChar, id).query(`
          UPDATE coa SET rno = @rno WHERE id = @id
        `);
      }

      res.status(200).json({ message: "updated successfully" });
    } catch (error) {
      console.error("SQL Error:", error);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  },

  getRoutes: async (req, res) => {
    try {
      const pool = await connection();
      const result = await pool.request().query(`
      SELECT DISTINCT route 
      FROM coa 
      WHERE route LIKE 'sr%' OR route LIKE 'kr%' 
      ORDER BY route
    `);

      routeLiSt = result.recordset; // array of route objects

      const kr = routeLiSt
        .filter((item) => item.route.toUpperCase().startsWith("KR"))
        .map((item) => item.route);

      const sr = routeLiSt
        .filter((item) => item.route.toUpperCase().startsWith("SR"))
        .map((item) => item.route);

      res.status(200).json({ kr, sr });
    } catch (err) {
      console.error("Error fetching routes:", err);
      throw err;
    }
  },
};

module.exports = CoaController;
