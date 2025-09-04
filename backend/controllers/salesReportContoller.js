// controllers/saleController.js
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Ensure this returns sql.connect(config)

exports.getSalesReport = async (req, res) => {
  const {
    startDate = new Date("2020-01-01").toISOString().split("T")[0],
    endDate,
    page = "",
    route = "",
    user = "",
    doc = null,
    customer = "",
    description = "",
    invoiceStatus = "",
  } = req.query;

  const newEndDate = new Date();
  newEndDate.setDate(newEndDate.getDate() + 7);

  let query = `
 SELECT 
  h.entrydate AS date,
  pd.doc,
  a.UrduName,
  a.Subsidary,
  a.route,
  pd.amount,
  pd.type AS Type,
  ISNULL(h.UserName, '') AS UserName,
  CASE 
    WHEN pack.nullPacked > 0 AND pack.nullPacked < pack.totalQty THEN 'pending'
    ELSE NULL
  END AS status
FROM PSDetail pd
JOIN coa a ON pd.acid = a.id
OUTER APPLY (
  SELECT TOP 1 entrydate, UserName
  FROM PSDetailHistory
  WHERE doc = pd.doc AND type = pd.type
) AS h
OUTER APPLY (
  SELECT 
    COUNT(CASE WHEN PackingDateTime IS NULL THEN 1 END) AS nullPacked,
    COUNT(CASE WHEN Qty > 0 THEN 1 END) AS totalQty
  FROM psproduct
  WHERE doc = pd.doc AND type = 'sale'
) AS pack
WHERE 
  pd.date BETWEEN @startDate AND @endDate
  AND pd.type = 'sale'
  AND (
    --COALESCE(@doc, '') = '' OR CAST(pd.doc AS VARCHAR) LIKE '%' + @doc + '%'
CAST(pd.doc AS VARCHAR) LIKE '%' + @doc + '%'
  )
  AND a.route LIKE '%' + @route + '%'
  AND (
    pd.status LIKE @invoiceStatus + '%' OR pd.status IS NULL
  )

`;

  if (!page.includes("pack")) {
    query += ` AND h.UserName LIKE '%' + @user + '%'`;
  }

  query += ` order by h.entrydate`;

  try {
    const pool = await dbConnection();
    const result = await pool
      .request()
      .input("startDate", sql.DateTime, new Date(startDate))
      .input("endDate", sql.DateTime, new Date(newEndDate))
      .input("route", sql.VarChar, route)
      .input("customer", sql.VarChar, customer)
      .input("description", sql.VarChar, description)
      .input("invoiceStatus", sql.VarChar, invoiceStatus)
      .input("user", sql.VarChar, user)
      .input("doc", sql.VarChar, String(doc ?? ""))
      .query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
};
