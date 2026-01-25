// controllers/saleController.js
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Ensure this returns sql.connect(config)

const getSalesReport = async (req, res) => {
  const {
    startDate = new Date("2023-01-01").toISOString().split("T")[0],
    endDate,
    page = "",
    route = "",
    user = "",
    doc = null,
    customer = "",
    description = "",
    invoiceStatus = "",
  } = req.query;

  isInvoice = invoiceStatus === "invoice" || invoiceStatus === "";
  const newStartDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const newEndDate = new Date();
  newEndDate.setDate(newEndDate.getDate() + 7);
  // startDate.setDate(newEndDate.getDate() - 7);
  let query = `;WITH HistoryCTE AS (
    SELECT 
        doc, 
        type, 
        MAX(entrydate) AS entrydate,
        MAX(UserName) AS UserName
    FROM PSDetailHistory
    GROUP BY doc, type
),
PackingCTE AS (
    SELECT 
        doc,
        SUM(CASE WHEN PackingDateTime IS NULL THEN 1 ELSE 0 END) AS nullPacked,
        COUNT(*) AS totalQty
    FROM psproduct
    WHERE type = 'sale'
    GROUP BY doc
)
SELECT 
    h.entrydate AS date,
    pd.doc,
    a.UrduName,
    a.Subsidary,
    a.route,
    pd.amount,
    pd.grossprofit,
    pd.type AS Type,
    ISNULL(h.UserName, '') AS UserName,
    CASE 
        WHEN p.nullPacked > 0 AND p.nullPacked < p.totalQty THEN 'pending'
        ELSE NULL
    END AS status
FROM PSDetail pd
INNER JOIN coa a 
    ON pd.acid = a.id
LEFT JOIN HistoryCTE h 
    ON h.doc = pd.doc AND h.type = pd.type
LEFT JOIN PackingCTE p 
    ON p.doc = pd.doc
WHERE 
    pd.type = 'sale'
    AND pd.date BETWEEN @startDate AND @endDate
    AND (@doc IS NULL OR CAST(pd.doc AS VARCHAR(20)) LIKE '%' + @doc + '%')
    AND (@route IS NULL OR a.route LIKE '%' + @route + '%')
    AND (
(@invoiceStatus = '' ) or
        (pd.status LIKE @invoiceStatus + '%')
      OR (@invoiceStatus = 'estimate' and  pd.status IS NULL)
    )
--ORDER BY pd.date DESC
`;

  if (!page.includes("pack")) {
    query += ` AND h.UserName LIKE '%' + @user + '%'`;
  }

  query += ` order by pd.date, h.entrydate;`;

  try {
    const pool = await dbConnection();
    const result = await pool
      .request()
      .input(
        "startDate",
        sql.DateTime,
        new Date((isInvoice || !startDate) ? newStartDate : startDate)
      )
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
    res.status(500).json({ error: "Failed to update status", msg: error });
  }
};

module.exports = {
  getSalesReport,
  putOnHoldStatus: updateOnHoldStatus,
};
