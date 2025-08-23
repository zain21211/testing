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
      console.log(req.user);
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

      if (usertype?.toLowerCase().includes("cust")) {
        acid = parseInt(usertype?.split("-")[1]);

        sql += ` AND id = ${acid}`;
      }

      if (!isAdmin && username?.toLowerCase() !== "zain")
        sql += ` AND MAIN = 'TRADE DEBTORS'`;

      // Add SPO filter only for non-ADMIN users (except for specific conditions)
      if (
        !isAdmin &&
        username?.toLowerCase() !== "zain" &&
        !usertype?.toLowerCase().includes("sm") &&
        !usertype?.toLowerCase().includes("operator") &&
        !usertype?.toLowerCase().includes("cust")
      ) {
        sql += ` AND SPO LIKE '%' + @name + '%'`;
      }

      // for SM userType
      if (usertype?.toLowerCase() === `sm-kr`) {
        sql += ` AND Route LIKE 'kr%'`;
      } else if (usertype?.toLowerCase() === `sm-sr`) {
        sql += ` AND Route LIKE 'sr%'`;
      } else if (usertype?.toLowerCase() === `sm-classic`) {
        sql += ` AND SPO LIKE '%classic%'`;
      }

      sql += ` ORDER BY id asc;`;

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
  getInactiveProducts: async (req, res) => {
    try {
      // --- Params from query ---
      const {
        acid,
        company = "fit-o%", // default like 'fit-o%'
        fromDate = "2024-01-01", // for ItemStatus
        days = 30, // inactivity threshold
      } = req.query;

      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("acid", mssql.Int, acid)
        .input("company", mssql.VarChar, company)
        .input("fromDate", mssql.Date, fromDate)
        .input("days", mssql.Int, days).query(`
        SELECT 
          LastOrderDate AS DATE,
          DATEDIFF(D, LastOrderDate, GETDATE()) AS DOC,
          ID AS PRID,
          urduNAME + ' ' + CATEGORY + ' ' + COMPANY AS Product,
          CASE 
            WHEN FORMAT(LastOrderDate,'dd-MMM-yyyy')='01-Jan-1900' 
            THEN 'No Order' 
            ELSE FORMAT(LastOrderDate,'dd-MMM-yyyy') 
          END AS LODate,
          ISNULL((
            SELECT SUM(qty2) 
            FROM PsProduct 
            WHERE PRID=x.ID 
              AND ACID=@acid 
              AND DATE=LastOrderDate
          ),0) AS QTY2,
          ISNULL((
            SELECT SUM(qty) 
            FROM PsProduct 
            WHERE PRID=x.ID 
              AND ACID=@acid 
              AND DATE=LastOrderDate
          ),0) AS QTY
        FROM (
          SELECT 
            ID,CODE,NAME,Category,Company,UrduName,
            ISNULL((
              SELECT MAX(DATE) 
              FROM PsProduct 
              WHERE PRID=P.ID 
                AND ACID=@acid 
                AND (QTY2>0 OR qty>0) 
                AND type='sale'
            ),'') AS LastOrderDate,
            ISNULL((
              SELECT COUNT(DATE) 
              FROM PsProduct 
              WHERE PRID=P.ID 
                AND qty>0 
                AND type='sale' 
                AND DATE>@fromDate
            ),'') AS ItemStatus
          FROM Products P 
          WHERE company LIKE @company 
            AND status<>'short'
        ) x 
        WHERE ItemStatus>@days 
          AND DATEDIFF(D, LastOrderDate, GETDATE())>@days
        ORDER BY ItemStatus DESC;
      `);

      const inactive = result.recordset;

      res.status(200).json(inactive);
    } catch (err) {
      console.error("SQL error:", err);
      res.status(500).json({ error: "Database query failed", msg: err });
    }
  },
};

module.exports = customerControllers;
