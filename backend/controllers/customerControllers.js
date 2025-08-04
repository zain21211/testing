const mssql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection

const customerControllers = {
  getCustomers: async (req, res) => {
    try {
      console.log(req.query);
      const pool = await dbConnection();
      const searchTerm = req.query.search || "";
      const username = req.query.username; // Get username from authenticated user token
      const usertype = req.query.usertype || req.user.userType || ""; // Try multiple keys for usertype
      const rawUser = req.user; // Log raw user object for debugging
      const form = req.query.form || " ";
      // Determine if user is ADMIN
      const isAdmin = usertype.toUpperCase() === "ADMIN";
      let acid;


      // Base SQL query
      let sql = `
        SELECT 
          id AS acid,
          Subsidary AS name,
          UrduName,
          OAddress,
          OCell,
          route,
          SPO
        FROM coa
        WHERE Subsidary LIKE '%' + @searchTerm + '%'
          
      `;

      if (usertype.toLowerCase().includes("cust")) {
        acid = parseInt(usertype?.split("-")[1]);

        sql += ` AND id = ${acid}`;
      }

      if (!isAdmin && username.toLowerCase() !== "zain")
        sql += ` AND MAIN = 'TRADE DEBTORS'`;

      // Add SPO filter only for non-ADMIN users (except for specific conditions)
      if (
        !isAdmin &&
        username.toLowerCase() !== "zain" &&
        form.toLowerCase() !== "recovery" &&
        !usertype.toLowerCase().includes("sm") &&
        !usertype.toLowerCase().includes("operator") &&
        !usertype.toLowerCase().includes("cust")
      ) {
        sql += ` AND SPO LIKE '%' + @name + '%'`;
      }

      // for SM userType
      if (usertype.toLowerCase() === `sm-kr`) {
        sql += ` AND Route LIKE 'kr%'`;
      } else if (usertype.toLowerCase() === `sm-sr`) {
        sql += ` AND Route LIKE 'sr%'`;
      } else if (usertype.toLowerCase() === `sm-classic`) {
        sql += ` AND SPO LIKE '%classic%'`;
      }

      sql += ` ORDER BY Subsidary ASC;`;

      const request = pool.request();

      request.input("searchTerm", mssql.NVarChar, searchTerm);

      if (!isAdmin) {
        request.input("name", mssql.NVarChar, username);
      }

      const result = await request.query(sql);
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Error retrieving customer data:", err.message, err.stack);
      res.status(500).send("Error retrieving customer data: " + err.message);
    }
  },
};

module.exports = customerControllers;
