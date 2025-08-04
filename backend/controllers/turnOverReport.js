const sql = require("mssql");
const dbConnection = require("../database/connection");
// Your config should be imported or already defined elsewhere
// const sqlConfig = { user, password, server, database, options... };

const TurnoverMethods = {
  getTurnoverReport: async (req, res) => {
    const { route = "", spo = "" } = req.query;
    try {
      const pool = await dbConnection(); // uses global config
      const result = await pool
        .request()
        .input("Route", sql.VarChar, route)
        .input("SPO", sql.VarChar, spo).query(`
        WITH LastDebit AS (
  SELECT
    ACID,
    DEBIT AS [Last Sale],
    Date AS [Sale Date],
    ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY Date DESC) AS rn
  FROM Ledgers
  WHERE DEBIT > 0
),
LastRecovery AS (
  SELECT
    ACID,
    CREDIT AS [Last Recovery],
    Date AS [Recovery Date],
    ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY Date DESC) AS rn
  FROM Ledgers
  WHERE Credit > 0
),
RecoveryData AS (
  SELECT 
    ACID,
    SUM(ISNULL(CREDIT, 0)) AS Recovery
  FROM Ledgers
  WHERE Date > DATEADD(MONTH, -1, GETDATE())
    AND Date < GETDATE()
  GROUP BY ACID
),
TodayData as (
      SELECT
      acid,
    SUM(CREDIT) AS payment,
    sum(DEBIT) as orderAmount
  FROM Ledgers
  WHERE date = CAST(GETDATE() AS DATE)
  group by acid
),
BalanceData AS (
  SELECT 
    A.ID AS ACID,
    A.Subsidary,
    A.UrduName,
    ISNULL(SUM(L.DEBIT), 0) - ISNULL(SUM(L.CREDIT), 0) AS Balance
  FROM Ledgers L
  JOIN COA A ON L.ACID = A.ID
  WHERE 
    A.ROUTE LIKE @Route + '%' 
    AND A.SPO LIKE @SPO + '%' 
    AND L.Date < GETDATE() 
    AND A.MAIN = 'TRADE DEBTORS'
  GROUP BY A.ID, A.Subsidary, A.UrduName
  HAVING ISNULL(SUM(L.DEBIT), 0) - ISNULL(SUM(L.CREDIT), 0) > 100
),
Limit as (
          select 
          id,
          creditdays as [Credit Days], 
          creditlimit as [Credit Limit]
          from coa
          
),
Promise AS (
  SELECT acid, remarks
  FROM (
    SELECT acid, remarks,
           ROW_NUMBER() OVER (PARTITION BY acid ORDER BY datetime DESC) AS rn
    FROM spoWorking
    WHERE CAST(datetime AS DATE) = CAST(GETDATE() AS DATE)
  ) AS x
  WHERE rn = 1
),
 OverdueData AS (
  SELECT 
    l.ACID,
    CASE 
      WHEN ISNULL(ROUND(SUM(DEBIT) - SUM(CREDIT), 0) -
        ISNULL((
          SELECT SUM(Debit) 
          FROM Ledgers 
          WHERE ACID = l.ACID 
            AND Date >= DATEADD(DAY, -ISNULL((
                SELECT CreditDays FROM COA WHERE ID = l.ACID
            ), 0), GETDATE())
        ), 0), 0) < 1 THEN 0
      ELSE ISNULL(ROUND(SUM(DEBIT) - SUM(CREDIT), 0) -
        ISNULL((
          SELECT SUM(Debit) 
          FROM Ledgers 
          WHERE ACID = l.ACID 
            AND Date >= DATEADD(DAY, -ISNULL((
                SELECT CreditDays FROM COA WHERE ID = l.ACID
            ), 0), GETDATE())
        ), 0), 0)
    END AS Overdue
  FROM Ledgers l
  GROUP BY l.ACID
)
SELECT 
  B.*,
  ISNULL(R.Recovery, 0) AS Recovery,
  LD.[Last Sale] as Sale,
  LD.[Sale Date],
  LR.[Last Recovery] as lrecovery,
  LR.[Recovery Date],
  t.payment,
  t.orderAmount,
  l.[Credit Days],
  l.[Credit Limit],
  p.remarks,
  O.Overdue,
  ROUND(
    CASE 
      WHEN ISNULL(R.Recovery, 0) > 0 THEN (B.Balance / R.Recovery) * 30
      ELSE B.Balance / 1
    END, 0
  ) AS [Turnover Days]
FROM BalanceData B
LEFT JOIN RecoveryData R ON R.ACID = B.ACID
LEFT JOIN LastDebit LD ON LD.ACID = B.ACID AND LD.rn = 1
LEFT JOIN LastRecovery LR ON LR.ACID = B.ACID AND LR.rn = 1
LEFT JOIN OverdueData O ON O.ACID = B.ACID
LEFT JOIN todaydata t ON t.ACID = B.ACID
LEFT JOIN limit l ON l.id = B.ACID
LEFT JOIN promise p ON p.acid = B.ACID
WHERE 
  CASE 
    WHEN ISNULL(R.Recovery, 0) > 0 THEN (B.Balance / R.Recovery) * 30
    ELSE B.Balance / 1
  END > 0
ORDER BY [Turnover Days] DESC;

      `);

      res.json(result.recordset);
    } catch (error) {
      console.error("Turnover Report Error:", error);
      res.status(500).json({ message: "Server error", error: error.message });
    }
  },
  postRemarks: async (req, res) => {
    const { datetime, acid, spo, remarks } = req.body;

    // Ensure it's a Date object
    const date = new Date(datetime);

    // Add 5 hours
    date.setHours(date.getHours() + 5);
    try {
      const pool = await dbConnection();
      await pool
        .request()
        .input("datetime", sql.DateTime, date)
        .input("acid", sql.Int, acid)
        .input("spo", sql.VarChar, spo)
        .input("remarks", sql.VarChar, remarks).query(`
        INSERT INTO SPOWORKING (datetime, acid, spo, remarks)
        VALUES (@datetime, @acid, @spo, @remarks)
      `);
      res.status(200).send({ success: true, message: "Inserted successfully" });
    } catch (err) {
      console.error("Insert SPOWorking error:", err);
      res.status(500).send({ success: false, error: err.message });
    }
  },
  getToday: async (req, res) => {
    const {acid} = req.query
    try {
      const pool = await dbConnection(); // uses global config
      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid``).query(`
      SELECT top 5
      remarks,
      datetime
      FROM spoworking
  WHERE acid = @acid
  `);

  res.status(200).send(result.recordset)
    } catch (err) {
      res.status(500).send({status: "failed", message: err})
    }
  },

  getTodayPayment: async (req, res) => {},
};
module.exports = { TurnoverMethods };
