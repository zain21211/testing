// controllers/saleController.js
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Ensure this returns sql.connect(config)

const getSalesReport = async (req, res) => {
  const {
    startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
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
  // startDate.setDate(newEndDate.getDate() - 7);
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

    const data = result.recordset;
    // res.status(200).json({ data, startDate, newEndDate });
    res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Failed to fetch sales report" });
  }
};

const updateOnHoldStatus = async (req, res) => {
  const { id, status } = req.body;
  const s = "estimate";

  if (!id || !status) {
    return res
      .status(400)
      .json({ error: "Missing id or status in request body" });
  }

  try {
    const pool = await dbConnection();
    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.VarChar, status)
      .input("s", sql.VarChar, s)
      .query(
        `UPDATE PSDetail
SET status = CASE
    WHEN status = @status THEN @s
    ELSE @status
END
WHERE doc = @id AND type = 'sale';
`
      );
    // if (result.rowsAffected[0] === 0) {
    //   return res.status(404).json({ error: "No record found to update" });
    // }

    res.status(200).json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating status:", error);
    res.status(500).json({ error: "Failed to update status", error });
  }
};

module.exports = {
  getSalesReport,
  putOnHoldStatus: updateOnHoldStatus,
};
