const mssql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection
const imageDb = require("../database/imagedb"); // Import your database connection

const customerControllers = {
  getCustomers: async (req, res) => {
    try {
      console.log(req.query.search);
      const pool = await dbConnection();
      const name = req.query.name || "";
      const route = req.query.route || "";
      const phoneNumber = req.query.phoneNumber || "";
      const username = req.user.username; // Get username from authenticated user token
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
        WHERE Subsidary LIKE '%' + @subsibary + '%'
        and route like '%' + @route + '%'
        and OCell like '%' + @number + '%'
          
      `;

      if (usertype.toLowerCase().includes("cust")) {
        acid = parseInt(usertype?.split("-")[1]);

        sql += ` AND id = ${acid}`;
      }

      if (!isAdmin && username?.toLowerCase() !== "zain")
        sql += ` AND MAIN = 'TRADE DEBTORS'`;

      // Add SPO filter only for non-ADMIN users (except for specific conditions)
      if (usertype?.toLowerCase() === "spo") {
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

      sql += ` ORDER BY id asc;`;

      const request = pool.request();

      request
        .input("subsibary", mssql.NVarChar, name)
        .input("route", mssql.NVarChar, route)
        .input("number", mssql.NVarChar, phoneNumber);

      if (!isAdmin && username?.toLowerCase() !== "zain") {
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

  // get new acid
  getAcid: async (req, res) => {
    try {
      const pool = await dbConnection();

      const result = await pool.request().query(`
      SELECT ISNULL(MAX(Id), 0) + 1 AS NextId FROM coa
    `);
      res.json({ acid: result.recordset[0].NextId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  // Controller to insert customer
  createCustomer: async (req, res) => {
    try {
      const payload = req.body;

      // map payload to DB fields
      const {
        name,
        urduname,
        address,
        route,
        phonenumber,
        whatsapp,
        creditdays,
        creditlimit,
        type,
        discounts,
        username,
        acid,
      } = payload;

      if (!acid) {
        return res.status(400).json({ error: "ACID are required" });
      }

      // take first discount (if provided)
      const d1 = discounts?.[0]?.d1 ?? null;
      const d2 = discounts?.[0]?.d2 ?? null;
      const pricelist = discounts?.[0]?.list ?? null;

      const pool = await dbConnection();

      // ✅ Step 2: insert with that Id
      const query = `
  INSERT INTO coa
  (Id, Date, Category, ACCATEGORY, Main, Control, Subsidary, UrduName, SPO,
   ContactPerson, OPhone, OCell, OFax, OAddress, UrduAddress, Area, City, EMail, URL,
   HPhone, HCell, HFax, HAddress, Balance, Status, Balance_Date, Cell, Crate, code,
   discount, discount2, van, day, route, sm, creditlimit, creditdays, ledgerno, path,
   pricelist, active, acType, RunsDate, rno, OCellNetwork, OCell2Network, Cell2, OCELLWA,
   OCELL2WA, Terms, Head)
VALUES
  (@Id, GETDATE(), 'BALANCE SHEET', @ACCATEGORY, 'TRADE DEBTORS', NULL, @Subsidary, @UrduName, @spo,
   NULL, NULL, @OCell, NULL, @OAddress, NULL, NULL, NULL, NULL, NULL,
   NULL, NULL, NULL, NULL, 0, 'Active', GETDATE(), NULL, NULL, NULL,
   @discount, @discount2, NULL, NULL, @route, NULL, @creditlimit, @creditdays,
   NULL, NULL, @pricelist, 1, @acType, GETDATE(), NULL, NULL, NULL, NULL, NULL,
   @OCELLWA, NULL, NULL);

    `;

      await pool
        .request()
        .input("Id", mssql.Int, acid)
        .input("spo", mssql.VarChar, username)
        .input("ACCATEGORY", mssql.VarChar, type)
        .input("Subsidary", mssql.VarChar, name)
        .input("UrduName", mssql.NVarChar, urduname)
        .input("OCell", mssql.VarChar, phonenumber)
        .input("OAddress", mssql.VarChar, address)
        .input("route", mssql.VarChar, route)
        .input("creditlimit", mssql.Int, creditlimit)
        .input("creditdays", mssql.Int, creditdays)
        .input("discount", mssql.Decimal(18, 2), d1)
        .input("discount2", mssql.Decimal(18, 2), d2)
        .input("pricelist", mssql.VarChar, pricelist)
        .input("acType", mssql.Int, 5)
        .input("OCELLWA", mssql.VarChar, whatsapp)
        .query(query);

      return res.status(201).json({ message: "Customer created successfully" });
    } catch (err) {
      console.error("Error inserting into coa:", err);
      return res
        .status(500)
        .json({ error: "Failed to create customer", msg: err.message });
    }
  },

  // Images insert
  createImages: async (req, res) => {
    const { acid, customer, shop, agreement } = req.body;
    try {
      const pool = await imageDb();
      if (!acid) {
        return res.status(400).json({ error: "ACID are required" });
      }

      // helper: convert base64 -> Buffer (works for "image" type)
      const toBuffer = (data) => {
        if (!data) return null;
        const base64 = data.split(";base64,").pop();
        return Buffer.from(base64, "base64");
      };

      const query = `
      INSERT INTO coaimages ( ACID, Customer, Shop, Agreement)
      VALUES ( @acid, @customer, @shop, @agreement)
    `;

      const request = pool.request();
      request.input("acid", mssql.Int, acid);
      request.input("customer", mssql.Image, toBuffer(customer));
      request.input("shop", mssql.Image, toBuffer(shop));
      request.input("agreement", mssql.Image, toBuffer(agreement));

      await request.query(query);

      res.status(201).json({ message: "Images uploaded successfully", acid });
    } catch (error) {
      console.error("❌ uploadCoaImages error:", error);
      res
        .status(500)
        .json({ error: "Failed to upload images", msg: error.message });
    }
  },
};

module.exports = customerControllers;
