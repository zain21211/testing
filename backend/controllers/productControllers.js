const dbConnection = require("../database/connection");

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
      res.status(500).json({ message: "Failed to fetch products.", error });
    } 
  },
};

module.exports = productControllers;
