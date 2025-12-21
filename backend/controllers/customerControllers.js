const mssql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection
const imageDb = require("../database/imagedb"); // Import your database connection
// const { getPakistanISODateString } = require("./CashEntryControllers");
const getPakistanISODateString = require("../utils/PakTime");

function cleanNumbers(input) {
  if (!input) return 0;
  const cleaned = input?.replace(/[^0-9]/g, ""); // keep only digits
  const num = cleaned ? parseFloat(cleaned) : 0; // convert to number
  return num;
}

function convertImages(record) {
  const imageObj = {};

  for (const key in record) {
    const value = record[key];
    if (Buffer.isBuffer(value)) {
      // Convert buffer -> base64 data URL
      imageObj[key.toLowerCase()] = `data:image/png;base64,${value.toString(
        "base64"
      )}`;
    } else {
      // Keep null or any non-buffer values
      imageObj[key] = value;
    }
  }

  return imageObj;
}

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
      // Base SQL query
      let sql = `
        SELECT 
          id AS acid,
          Subsidary AS name,
          UrduName,
          OAddress as address,
          OCell as phonenumber,
          route,
          SPO,
          creditlimit,
          creditdays,
          ACCATEGORY as type, 
          worth as monthlytransaction,
          buyingsource
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
        acid,
        name,
        type,
        route,
        address,
        whatsapp,
        username,
        urduname,
        creditdays,
        creditlimit,
        phonenumber,
        longitude,
        latitude,
        monthlytransaction: worth,
        buyingsource,
        discounts = [],
      } = payload;

      if (!acid) {
        return res.status(400).json({ error: "ACID are required" });
      }

      const disQuery = `
   insert into partydiscount(
    acid, 
    company, 
    discount, 
    disc1p,
    pricelist
   ) values(
    @acid, 
    @company, 
    @d2, 
    @d1,
    @pricelist
   ) 
   `;
      const pool = await dbConnection();

      // ✅ Step 2: insert with that Id
      const query = `
INSERT INTO coa
(
    Id,Code, Control, Date, Category, ACCATEGORY, Main, Subsidary, UrduName, SPO,
    OCell, OAddress, Balance, Status, Balance_Date,
    route, creditlimit, creditdays, active, acType, RunsDate, OCELLWA,
    Longitude, Latitude, Worth, BuyingSource
)
VALUES
(
    @Id, @Code, 'SUPPLY', GETDATE(), 'BALANCE SHEET', @ACCATEGORY, 'TRADE DEBTORS', @Subsidary, @UrduName, @spo,
    @OCell, @OAddress, 0, 'Active', GETDATE(),
    @route, @creditlimit, @creditdays, 1, @acType, GETDATE(), @OCELLWA,
    @Longitude, @Latitude, @Worth, @BuyingSource
);
    `;

      await pool
        .request()
        .input("Id", mssql.Int, acid)
        .input("Code", mssql.VarChar, String(acid))
        .input("spo", mssql.VarChar, username)
        .input("ACCATEGORY", mssql.VarChar, type || 'customer')
        .input("Subsidary", mssql.VarChar, name.toUpperCase())
        .input("UrduName", mssql.NVarChar, urduname)
        .input("OCell", mssql.VarChar, phonenumber.toUpperCase() || "")
        .input("OAddress", mssql.VarChar, address.toUpperCase() || "")
        .input("route", mssql.VarChar, route.toUpperCase() || "")
        .input("creditlimit", mssql.Int, creditlimit || 0)
        .input("creditdays", mssql.Int, creditdays || 0)
        .input("acType", mssql.Int, 5)
        .input("Longitude", mssql.Float, longitude || 0)
        .input("Latitude", mssql.Float, latitude || 0)
        .input("Worth", mssql.Int, cleanNumbers(worth || 0))
        .input("Buyingsource", mssql.VarChar, buyingsource.toUpperCase() || "")
        .input("OCELLWA", mssql.VarChar, whatsapp.toUpperCase() || "")
        .query(query);

      // Assuming discounts is an array of objects like:
      // [{ acid, d1, d2, pricelist, company }, {...}, ...]

      await Promise.all(
        (discounts ?? []).map(({ d1, d2, list, company }) =>
          pool
            .request()
            .input("acid", mssql.Int, acid)
            .input("d1", mssql.Decimal(18, 2), d1)
            .input("d2", mssql.Decimal(18, 2), d2)
            .input("pricelist", mssql.VarChar, list)
            .input("company", mssql.VarChar, company)
            .query(disQuery)
        )
      );

      return res.status(201).json({ message: "Customer created successfully" });
    } catch (err) {
      console.error("Error inserting into coa:", err);
      return res
        .status(500)
        .json({ error: "Failed to create customer", msg: err.message });
    }
  },

  // Controller to insert customer
  updateCustomer: async (req, res) => {
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
        type = "",
        discounts = [],
        username,
        acid,
        monthlytransaction: worth = "",
        buyingsource = "",
      } = payload;

      if (!acid) {
        return res.status(400).json({ error: "ACID are required" });
      }

      const disQuery = `
                      UPADTE PARTYDISCOUNT SET
                          company=@company, 
                          discount=@d2, 
                          disc1p=@d1,
                          pricelist=@pricelist
                       WHERE 
                          acid=@acid,  
    
   `;
      const pool = await dbConnection();

      // ✅ Step 2: insert with that Id
      const query = `
UPDATE coa
SET 
    ACCATEGORY = @ACCATEGORY,
    Subsidary = @Subsidary,
    UrduName = @UrduName,
    SPO = @spo,
    OCell = @OCell,
    OAddress = @OAddress,
    route = @route,
    creditlimit = @creditlimit,
    creditdays = @creditdays,
    acType = @acType,
    OCELLWA = @OCELLWA,
    worth = @Worth,
    buyingsource = @Buyingsource
WHERE Id = @Id;

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
        .input("acType", mssql.Int, 5)
        .input("OCELLWA", mssql.VarChar, whatsapp)
        .input("Worth", mssql.Int, cleanNumbers(worth))
        .input("Buyingsource", mssql.VarChar, buyingsource)
        .query(query);

      await Promise.all(
        (discounts ?? []).map(({ d1, d2, list, company }) =>
          pool
            .request()
            .input("acid", mssql.Int, acid)
            .input("d1", mssql.Decimal(18, 2), d1)
            .input("d2", mssql.Decimal(18, 2), d2)
            .input("pricelist", mssql.VarChar, list)
            .input("company", mssql.VarChar, company)
            .query(disQuery)
        )
      );

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
    const { acid, customer, shop, agreement, username, date } = req.body;
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
      INSERT INTO coaimages ( ACID, Customer, Shop, Agreement, imageby, datetime)
      VALUES ( @acid, @customer, @shop, @agreement, @username, @Date)
    `;

      const request = pool.request();
      request.input("acid", mssql.Int, acid);
      request.input("customer", mssql.Image, toBuffer(customer));
      request.input("shop", mssql.Image, toBuffer(shop));
      request.input("username", mssql.VarChar, username || "unknown");
      request.input("Date", mssql.DateTime, date);
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

  // Images upadate
  updateImages: async (req, res) => {
    const {
      acid,
      customer,
      shop,
      agreement,
      username,
      date = new Date(),
    } = req.body;

    const dateTime = getPakistanISODateString(date);
    console.log("Updating images with date:", new Date(dateTime));
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
        IF EXISTS (SELECT 1 FROM COAIMAGES WHERE acid = @acid)
BEGIN
    UPDATE COAIMAGES
    SET 
        datetime=@Date,
        imageby=@username,
        Customer = @customer,
        Shop = @shop,
        Agreement = @agreement
    WHERE acid = @acid;
END
ELSE
BEGIN
    INSERT INTO COAIMAGES (acid, Customer, Shop, Agreement, imageby, datetime)
    VALUES (@acid, @customer, @shop, @agreement, @username, @Date);
END

    `;

      const request = pool.request();
      request.input("acid", mssql.Int, acid);
      request.input("customer", mssql.Image, toBuffer(customer));
      request.input("shop", mssql.Image, toBuffer(shop));
      request.input("agreement", mssql.Image, toBuffer(agreement));
      request.input("username", mssql.VarChar, username || "unknown");
      request.input("Date", mssql.VarChar, dateTime);

      await request.query(query);

      res.status(201).json({ message: "Images uploaded successfully", acid });
    } catch (error) {
      console.error("❌ uploadCoaImages error:", error);
      res
        .status(500)
        .json({ error: "Failed to upload images", msg: error.message });
    }
  },

  getImages: async (req, res) => {
    const { acid, col } = req.query;
    try {
      const pool = await imageDb();
      if (!acid) {
        return res.status(400).json({ error: "ACID are required" });
      }

      const cols = col || ["Customer", "Shop", "Agreement"];
      console.log("Fetching columns:", cols);

      const query = `
        SELECT
        ${cols}
        FROM COAIMAGES
        WHERE acid=@acid
      `;
      const result = await pool
        .request()
        .input("acid", mssql.Int, acid)
        .query(query);

      const record = result.recordset[0];

      // Convert all buffer fields in one go
      const images = convertImages(record);

      res.status(201).json({ status: "successful", images });
    } catch (error) {
      console.error("❌ uploadCoaImages error:", error);
      res
        .status(500)
        .json({ error: "Failed to upload images", msg: error.message });
    }
  },

  createDeliveryImages: async (req, res) => {
    const {
      doc,
      img,
      id,
      type = "sale",
      status = "",
      date = new Date(),
    } = req.body;
    try {
      const pool = await imageDb();
      if (!doc && !id) {
        return res.status(400).json({ error: "ACID or doc are required" });
      }

      // helper: convert base64 -> Buffer (works for "image" type)
      const toBuffer = (data) => {
        if (!data) return null;
        const base64 = data.split(";base64,").pop();
        return Buffer.from(base64, "base64");
      };

      const query = `
      INSERT INTO name_reciepts ( doc, acid, image, type, status, datetime)
      VALUES ( @doc, @acid, @img, @type, @status, @datetime)
    `;

      const request = pool.request();
      request.input("doc", mssql.Int, doc);
      request.input("acid", mssql.Int, id);
      request.input("type", mssql.VarChar, type);
      request.input("status", mssql.VarChar, status);
      request.input("datetime", mssql.DateTime, date);
      request.input("img", mssql.VarBinary, toBuffer(img));

      await request.query(query);

      res.status(201).json({ message: "Images uploaded successfully", doc });
    } catch (error) {
      console.error("❌ uploadCoaImages error:", error);
      res
        .status(500)
        .json({ error: "Failed to upload images", msg: error.message });
    }
  },
};

module.exports = customerControllers;
