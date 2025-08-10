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

-- Last Sale per ACID
WITH LastDebit AS (
    SELECT ACID, DEBIT AS [Last Sale], Date AS [Sale Date],
           ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY Date DESC) AS rn
    FROM Ledgers
    WHERE DEBIT > 0
),
-- Last Recovery per ACID
LastRecovery AS (
    SELECT ACID, CREDIT AS [Last Recovery], Date AS [Recovery Date],
           ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY Date DESC) AS rn
    FROM Ledgers
    WHERE CREDIT > 0
),
-- Monthly Recovery
RecoveryData AS (
    SELECT ACID, SUM(ISNULL(CREDIT, 0)) AS Recovery
    FROM Ledgers
    WHERE Date >= DATEADD(MONTH, -1, CAST(GETDATE() AS DATE))
      AND Date < CAST(GETDATE() AS DATE)
    GROUP BY ACID
),
-- Today's Payment and Order
TodayData AS (
    SELECT acid,
           SUM(CASE WHEN entryby = @spo THEN CREDIT ELSE 0 END) AS payment,
           SUM(DEBIT) AS orderAmount
    FROM Ledgers
    WHERE Date >= CAST(GETDATE() AS DATE) AND Date < DATEADD(DAY, 1, CAST(GETDATE() AS DATE))
    GROUP BY acid
),
-- Balance for customers
BalanceData AS (
    SELECT A.ID AS ACID, A.Subsidary, A.UrduName, A.Ocell AS number,
           ISNULL(SUM(L.DEBIT), 0) - ISNULL(SUM(L.CREDIT), 0) AS Balance
    FROM Ledgers L
    JOIN COA A ON L.ACID = A.ID
    WHERE A.ROUTE LIKE '%' + @Route + '%'
      AND A.SPO LIKE @SPO + '%'
      AND A.MAIN = 'TRADE DEBTORS'
    GROUP BY A.ID, A.Subsidary, A.UrduName, A.Ocell
    HAVING ISNULL(SUM(L.DEBIT), 0) - ISNULL(SUM(L.CREDIT), 0) > 100
),
-- Credit Days & Limits
LimitData AS (
    SELECT ID, CreditDays, CreditLimit
    FROM COA
),
-- Latest remarks today
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
TotalBalance AS (
    SELECT 
        L.ACID,
        SUM(L.DEBIT) AS TotalDebit,
        SUM(L.CREDIT) AS TotalCredit
    FROM Ledgers L
    GROUP BY L.ACID
),
RecentDebits AS (
    SELECT 
        L.ACID,
        SUM(L.DEBIT) AS RecentDebit
    FROM Ledgers L
    INNER JOIN COA ON L.ACID = COA.ID
    WHERE L.Date >= DATEADD(DAY, -ISNULL(COA.CreditDays, 0), GETDATE())
    GROUP BY L.ACID
),
OverdueData AS (
    SELECT 
        TB.ACID,
        CASE 
            WHEN ISNULL(COA.CreditDays, 0) = 0 THEN 0
            ELSE 
                CASE 
                    WHEN (ISNULL(TB.TotalDebit, 0) - ISNULL(TB.TotalCredit, 0) - ISNULL(RD.RecentDebit, 0)) < 1 THEN 0
                    ELSE (ISNULL(TB.TotalDebit, 0) - ISNULL(TB.TotalCredit, 0) - ISNULL(RD.RecentDebit, 0))
                END
        END AS Overdue
    FROM TotalBalance TB
    LEFT JOIN RecentDebits RD ON TB.ACID = RD.ACID
    INNER JOIN COA ON TB.ACID = COA.ID
)

-- Final Result
SELECT 
    B.*,
    ISNULL(R.Recovery, 0) AS Recovery,
    LD.[Last Sale] AS Sale,
    LD.[Sale Date],
    LR.[Last Recovery] AS lrecovery,
    LR.[Recovery Date],
    T.payment,
    T.orderAmount,
    L.CreditDays as [Credit Days],
    L.CreditLimit as [Credit Limit],
    P.remarks,
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
LEFT JOIN TodayData T ON T.ACID = B.ACID
LEFT JOIN LimitData L ON L.ID = B.ACID
LEFT JOIN Promise P ON P.ACID = B.ACID
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
        .input("remarks", sql.NVarChar, remarks).query(`
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
    
  if (!acid) {
    return res.status(400).send({ status: "error", message: "Missing 'acid' parameter" });
  }

    try {
      const pool = await dbConnection(); // uses global config
      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid.toString()).query(`
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
