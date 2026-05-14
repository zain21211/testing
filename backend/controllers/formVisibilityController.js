require("dotenv").config();
const mssql = require("mssql");
const jwt = require("jsonwebtoken");
const dbConnection = require("../database/connection");

// All form keys and their default visible user types
const ALL_FORM_KEYS = [
  "packing",
  "load",
  "spo",
  "paymentvoucher",
  "saleshistory",
  "accounts",
  "recovery",
  "sales",
  "neworder",
  "products",
  "routes",
  "delivery",
  "imageviewer",
  "ledger",
  "pendingdemand",
  "visibility",
];

const ALL_USER_TYPES = [
  "admin",
  "sm",
  "operator",
  "pack",
  "payment",
  "spo",
  "bilty",
];

// Default visibility matrix (mirrors the current hardcoded LoginPage logic)
const DEFAULT_VISIBILITY = {
  packing:        ["admin", "pack", "operator"],
  load:           ["admin", "pack", "operator"],
  spo:            ["admin", "spo", "operator"],
  paymentvoucher: ["admin", "payment"],
  saleshistory:   ["admin", "payment"],
  accounts:       ["admin", "sm", "operator"],
  recovery:       ["admin", "sm", "operator"],
  sales:          ["admin", "sm", "operator"],
  neworder:       ["admin", "sm", "operator"],
  products:       ["admin", "sm"],
  routes:         ["admin", "sm"],
  delivery:       ["admin", "sm", "bilty"],
  imageviewer:    ["admin", "sm", "operator"],
  ledger:         ["admin", "sm", "operator"],
  pendingdemand:  ["admin", "sm", "operator"],
};

// Ensure the FORM_VISIBILITY table exists and seed defaults if empty or missing keys
const ensureTableAndSeed = async (pool) => {
  // 1. Create table and column if not exists
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FORM_VISIBILITY')
    BEGIN
      CREATE TABLE FORM_VISIBILITY (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        usertype  NVARCHAR(50) NOT NULL,
        form_key  NVARCHAR(50) NOT NULL,
        is_visible BIT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        CONSTRAINT UQ_FORM_VIS UNIQUE (usertype, form_key)
      )
    END
    ELSE
    BEGIN
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'FORM_VISIBILITY' AND COLUMN_NAME = 'sort_order')
      BEGIN
        ALTER TABLE FORM_VISIBILITY ADD sort_order INT NOT NULL DEFAULT 0
      END
    END
  `);

  // 2. Fetch all unique user types from USERS table and normalize (e.g. customer-123 -> customer)
  const userTypesRes = await pool.request().query("SELECT DISTINCT USERTYPE FROM USERS WHERE USERTYPE IS NOT NULL");
  const dbUserTypes = userTypesRes.recordset.map(r => r.USERTYPE.toLowerCase().split('-')[0]);
  
  // Merge with hardcoded list to ensure standard roles exist
  const finalUserTypes = Array.from(new Set([...ALL_USER_TYPES, ...dbUserTypes]));

  // Cleanup: Remove any old entries that still have dashes (e.g. customer-123)
  // to ensure only normalized base types (e.g. customer) exist in the manager.
  await pool.request().query("DELETE FROM FORM_VISIBILITY WHERE usertype LIKE '%-%'");

  // 3. Bulk Seed Missing Entries - Single Optimized Query
  // We combine dynamic user types and hardcoded ones, then cross join with form keys.
  const utValues = finalUserTypes.map(ut => `('${ut}')`).join(", ");
  const formValues = ALL_FORM_KEYS.map((key, idx) => `('${key}', ${idx})`).join(", ");
  const defaultVisEntries = Object.entries(DEFAULT_VISIBILITY).map(([fk, roles]) => 
    `WHEN v.fkey = '${fk}' AND u.ut IN (${roles.map(r => `'${r}'`).join(",")}) THEN 1`
  ).join("\n               ");

  await pool.request().query(`
    INSERT INTO FORM_VISIBILITY (usertype, form_key, is_visible, sort_order)
    SELECT u.ut, v.fkey, 
           CASE 
             WHEN u.ut = 'admin' THEN 1
             ${defaultVisEntries}
             ELSE 0
           END,
           v.sorder
    FROM (SELECT ut FROM (VALUES ${utValues}) AS temp(ut)) AS u
    CROSS JOIN (VALUES ${formValues}) AS v(fkey, sorder)
    WHERE NOT EXISTS (
      SELECT 1 FROM FORM_VISIBILITY 
      WHERE usertype = u.ut AND form_key = v.fkey
    )
  `);
};

// GET /api/form-visibility
// Returns all rows: [{ usertype, form_key, is_visible, sort_order }]
const getFormVisibility = async (req, res) => {
  try {
    const pool = await dbConnection();
    await ensureTableAndSeed(pool);

    const result = await pool
      .request()
      .query("SELECT usertype, form_key, is_visible, sort_order FROM FORM_VISIBILITY ORDER BY sort_order ASC");

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("getFormVisibility error:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PUT /api/form-visibility
// Body: { usertype, form_key, is_visible, sort_order }
// Admin-only — validated via JWT in this controller
const updateFormVisibility = async (req, res) => {
  // --- Admin guard ---
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.userType?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const { usertype, form_key, is_visible, sort_order } = req.body;
  if (!usertype || !form_key || is_visible === undefined) {
    return res.status(400).json({ message: "usertype, form_key, and is_visible are required." });
  }

  try {
    const pool = await dbConnection();
    await ensureTableAndSeed(pool);

    await pool
      .request()
      .input("usertype", mssql.NVarChar, usertype.toLowerCase())
      .input("form_key", mssql.NVarChar, form_key.toLowerCase())
      .input("is_visible", mssql.Bit, is_visible ? 1 : 0)
      .input("sort_order", mssql.Int, sort_order || 0)
      .query(`
        MERGE FORM_VISIBILITY AS target
        USING (SELECT @usertype AS usertype, @form_key AS form_key) AS source
        ON target.usertype = source.usertype AND target.form_key = source.form_key
        WHEN MATCHED THEN
          UPDATE SET is_visible = @is_visible, sort_order = @sort_order
        WHEN NOT MATCHED THEN
          INSERT (usertype, form_key, is_visible, sort_order)
          VALUES (@usertype, @form_key, @is_visible, @sort_order);
      `);

    res.status(200).json({ message: "Visibility updated." });
  } catch (error) {
    console.error("updateFormVisibility error:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PUT /api/form-visibility/bulk
const updateFormVisibilityBulk = async (req, res) => {
  // --- Admin guard ---
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized." });
    }
    const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    if (decoded.userType?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const { updates } = req.body;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ message: "updates array is required." });
  }

  try {
    const pool = await dbConnection();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      for (const update of updates) {
        const { usertype, form_key, is_visible, sort_order } = update;
        await transaction.request()
          .input("usertype", mssql.NVarChar, usertype.toLowerCase())
          .input("form_key", mssql.NVarChar, form_key.toLowerCase())
          .input("is_visible", mssql.Bit, is_visible ? 1 : 0)
          .input("sort_order", mssql.Int, sort_order || 0)
          .query(`
            MERGE FORM_VISIBILITY AS target
            USING (SELECT @usertype AS usertype, @form_key AS form_key) AS source
            ON target.usertype = source.usertype AND target.form_key = source.form_key
            WHEN MATCHED THEN
              UPDATE SET is_visible = @is_visible, sort_order = @sort_order
            WHEN NOT MATCHED THEN
              INSERT (usertype, form_key, is_visible, sort_order)
              VALUES (@usertype, @form_key, @is_visible, @sort_order);
          `);
      }
      await transaction.commit();
      res.status(200).json({ message: "Bulk visibility updated." });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (error) {
    console.error("updateFormVisibilityBulk error:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

module.exports = {
  getFormVisibility,
  updateFormVisibility,
  updateFormVisibilityBulk
};
