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
};

// Ensure the FORM_VISIBILITY table exists and seed defaults if empty or missing keys
const ensureTableAndSeed = async (pool) => {
  // Create table if not exists
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME = 'FORM_VISIBILITY'
    )
    BEGIN
      CREATE TABLE FORM_VISIBILITY (
        id        INT IDENTITY(1,1) PRIMARY KEY,
        usertype  NVARCHAR(50) NOT NULL,
        form_key  NVARCHAR(50) NOT NULL,
        is_visible BIT NOT NULL DEFAULT 1,
        CONSTRAINT UQ_FORM_VIS UNIQUE (usertype, form_key)
      )
    END
  `);

  // Check and add missing keys for each usertype
  for (const usertype of ALL_USER_TYPES) {
    for (const formKey of ALL_FORM_KEYS) {
      const isVisible = DEFAULT_VISIBILITY[formKey]?.includes(usertype) ? 1 : 0;
      await pool
        .request()
        .input("usertype", mssql.NVarChar, usertype)
        .input("form_key", mssql.NVarChar, formKey)
        .input("is_visible", mssql.Bit, isVisible)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM FORM_VISIBILITY 
            WHERE usertype = @usertype AND form_key = @form_key
          )
          BEGIN
            INSERT INTO FORM_VISIBILITY (usertype, form_key, is_visible)
            VALUES (@usertype, @form_key, @is_visible)
          END
        `);
    }
  }
};

// GET /api/form-visibility
// Returns all rows: [{ usertype, form_key, is_visible }]
const getFormVisibility = async (req, res) => {
  try {
    const pool = await dbConnection();
    await ensureTableAndSeed(pool);

    const result = await pool
      .request()
      .query("SELECT usertype, form_key, is_visible FROM FORM_VISIBILITY");

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("getFormVisibility error:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// PUT /api/form-visibility
// Body: { usertype, form_key, is_visible }
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

  const { usertype, form_key, is_visible } = req.body;

  if (!usertype || !form_key || is_visible === undefined) {
    return res.status(400).json({ message: "usertype, form_key, and is_visible are required." });
  }

  if (!ALL_USER_TYPES.includes(usertype.toLowerCase())) {
    return res.status(400).json({ message: `Unknown usertype: ${usertype}` });
  }

  if (!ALL_FORM_KEYS.includes(form_key.toLowerCase())) {
    return res.status(400).json({ message: `Unknown form_key: ${form_key}` });
  }

  try {
    const pool = await dbConnection();
    await ensureTableAndSeed(pool);

    await pool
      .request()
      .input("usertype", mssql.NVarChar, usertype.toLowerCase())
      .input("form_key", mssql.NVarChar, form_key.toLowerCase())
      .input("is_visible", mssql.Bit, is_visible ? 1 : 0)
      .query(`
        MERGE FORM_VISIBILITY AS target
        USING (SELECT @usertype AS usertype, @form_key AS form_key) AS source
        ON target.usertype = source.usertype AND target.form_key = source.form_key
        WHEN MATCHED THEN
          UPDATE SET is_visible = @is_visible
        WHEN NOT MATCHED THEN
          INSERT (usertype, form_key, is_visible)
          VALUES (@usertype, @form_key, @is_visible);
      `);

    res.status(200).json({ message: "Visibility updated." });
  } catch (error) {
    console.error("updateFormVisibility error:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

module.exports = { getFormVisibility, updateFormVisibility };
