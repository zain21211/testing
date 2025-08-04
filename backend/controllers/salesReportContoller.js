// controllers/saleController.js
const sql = require('mssql');
const dbConnection = require('../database/connection'); // Ensure this returns sql.connect(config)

exports.getSalesReport = async (req, res) => {
  const {
    startDate = new Date('2020-01-01').toISOString().split('T')[0],
    endDate,
    page = '',
    route = '',
    user = '',
    doc = null,
    customer = '',
    description = '',
    invoiceStatus = '',
  } = req.query;

  console.log(req.query)

  const newEndDate = new Date();
newEndDate.setDate(newEndDate.getDate() + 7);

 let query = `
  SELECT * FROM (
    SELECT 
      ROW_NUMBER() OVER (ORDER BY a.route, pd.doc) AS rn,
       (select top 1 entrydate from PSDetailHistory where type='sale' and doc=pd.doc) date, pd.doc, a.UrduName, a.Subsidary, a.route,
      CASE WHEN OCELL2WA = 'Y' THEN Cell2 ELSE OCell END AS oCell,
      pd.description, pd.amount,pd.type as Type,
      ISNULL(pd.RECEIVED, 0) AS RECEIVED,
      ISNULL(pd.grossprofit, 0) AS grossprofit,
      ROUND(CASE 
        WHEN ISNULL(pd.amount, 0) <> 0 
          THEN ROUND((pd.grossprofit / pd.amount) * 100, 2) 
        ELSE 0 
      END, 2) AS PP,
      ABS(pd.freight) AS Freight,
      ISNULL(pd.remarks, '') AS remarks,
      ISNULL(a.RunsDate, CONVERT(datetime, '01.01.2020', 104)) AS RDate,
      ISNULL(pd.GOODS, '') AS GOODS,
      a.id,
      ISNULL((
        SELECT TOP 1 UserName 
        FROM PSDetailHistory 
        WHERE DOC = PD.DOC AND TYPE = PD.TYPE
      ), '') AS UserName,
      (
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM psproduct 
      WHERE doc = pd.doc AND type = 'sale' AND PackingDateTime IS NULL
    ) > 0 -- for null check
    AND (
      SELECT COUNT(*) 
      FROM psproduct 
      WHERE doc = pd.doc AND type = 'sale' AND PackingDateTime IS NULL
    ) < ( -- check if all products are packed
      SELECT COUNT(*) 
      FROM psproduct 
      WHERE doc = pd.doc AND type = 'sale' AND Qty > 0
    ) 
    THEN 'pending'
    ELSE NULL
  END
) AS status

    FROM PSDetail pd 
    JOIN coa a ON pd.acid = a.id 
    WHERE 
      pd.date >= @startDate AND 
      pd.date <= @endDate AND 
      pd.type = 'sale' AND 
      (COALESCE(@doc, '') = '' OR CAST(pd.doc AS VARCHAR) LIKE '%' + CAST(COALESCE(@doc, '') AS VARCHAR) + '%')

AND
      a.route LIKE '%' + @route + '%' AND 
      a.subsidary LIKE @customer + '%' AND 
      pd.description LIKE '%' + @description + '%' AND 
      (
        pd.status LIKE @invoiceStatus + '%' OR 
        pd.status IS NULL
      )
  ) x
`;

if (!page.includes("pack")) {
  console.log("page does not include pack");
  query += ` WHERE x.UserName LIKE '%' + @user + '%'`;
}

query += `order by x.date`;
  try {
    const pool = await dbConnection();
    const result = await pool.request()
      .input('startDate', sql.DateTime, new Date(startDate))
      .input('endDate', sql.DateTime, new Date(newEndDate))
      .input('route', sql.VarChar, route)
      .input('customer', sql.VarChar, customer)
      .input('description', sql.VarChar, description)
      .input('invoiceStatus', sql.VarChar, invoiceStatus)
      .input('user', sql.VarChar, user)
      .input('doc', sql.Int, doc)
      .query(query);

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching sales report:', error);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
};
