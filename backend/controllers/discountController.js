const sql = require("mssql");
const dbConnection = require("../database/connection");

const discountControllers = {
  getDiscount: async (req, res) => {
    const { acid, company } = req.query;
    if (!acid || !company) {
      return res
        .status(400)
        .json({ error: "acid and company are required parameters" });
    }

    try {
      const sqlQuery = `
      SELECT TOP 1 disc1P, discount
      FROM PartyDiscount
      WHERE acid = @acid AND company = @company
    `;

      const pool = await dbConnection(); // should return connected pool
      const request = pool.request();
      request.input("acid", sql.NVarChar, acid);
      request.input("company", sql.NVarChar, company);

      const result = await request.query(sqlQuery);

      if (result.recordset.length === 0) {
        return res
          .status(200)
          .json({ message: "No discount found for this account and company" });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
  getDiscountAll: async (req, res) => {
    const { acid } = req.query;
    if (!acid) {
      return res.status(400).json({ error: "acid are required parameters" });
    }

    try {
      const sqlQuery = `
      SELECT *
      FROM PartyDiscount
      WHERE acid = @acid 
    `;

      const pool = await dbConnection(); // should return connected pool
      const request = pool.request();
      request.input("acid", sql.NVarChar, acid);

      const result = await request.query(sqlQuery);

      if (result.recordset.length === 0) {
        return res.status(200).json({ message: "No discount found " });
      }

      res.json(result.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = discountControllers;
