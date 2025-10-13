const sql = require("mssql");
const dbConnection = require("../database/connection");
// Your config should be imported or already defined elsewhere
// const sqlConfig = { user, password, server, database, options... };

const TurnoverMethods = {
  getTurnoverReport: async (req, res) => {
    const { route = "", spo = "", date = new Date() } = req.query;
    try {
      const pool = await dbConnection(); // uses global config
      const result = await pool
        .request()
        .input("SPO", sql.VarChar, spo)
        .input("Date", sql.Date, date) // your date variable
        .input("Route", sql.VarChar, route) // assuming you have a @Route parameter
        .query(`

WITH LastDebit AS (
    SELECT ACID, DEBIT AS [Last Sale], [Date] AS [Sale Date],
           ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY [Date] DESC) AS rn
    FROM Ledgers
    WHERE DEBIT > 0
),
LastRecovery AS (
    SELECT ACID, CREDIT AS [Last Recovery], [Date] AS [Recovery Date],
           ROW_NUMBER() OVER (PARTITION BY ACID ORDER BY [Date] DESC) AS rn
    FROM Ledgers
    WHERE CREDIT > 0
),
RecoveryData AS (
    SELECT ACID, SUM(ISNULL(CREDIT, 0)) AS Recovery
    FROM Ledgers
    WHERE [Date] >= DATEADD(MONTH, -1, CAST(@Date AS DATE))
      AND [Date] < CAST(@Date AS DATE)
    GROUP BY ACID
),
OrderSummary AS (
    SELECT 
        pss.Acid,
        CAST(pss.[Date] AS DATE) AS [OnlyDate],
        SUM(CASE WHEN p.company LIKE 'fit%'  THEN pss.vist ELSE 0 END) AS FitOrderAmount,
        SUM(CASE WHEN p.company NOT LIKE 'fit%' THEN pss.vist ELSE 0 END) AS OtherOrderAmount
    FROM PsProduct pss
    JOIN Products p ON pss.prid = p.ID
    WHERE pss.spo LIKE @SPO + '%'
      AND pss.[Date] >= CAST(@Date AS DATE)
      AND pss.[Date] < DATEADD(DAY, 1, CAST(@Date AS DATE))
    GROUP BY pss.Acid, CAST(pss.[Date] AS DATE)
),
TodayData AS (
    SELECT 
        l.acid,
        MAX(CAST(l.entrydatetime AS TIME)) AS time,   -- latest payment time
location.Latitude,
        location.Longitude,
        location.Address,        SUM(CASE WHEN l.entryby = @SPO THEN l.CREDIT ELSE 0 END) AS Payment,
        ISNULL(os.FitOrderAmount, 0)  AS FitOrderAmount,
        ISNULL(os.OtherOrderAmount, 0) AS OtherOrderAmount
    FROM Ledgers l
     CROSS APPLY (
        SELECT TOP 1 l2.Latitude, l2.Longitude, l2.Address
        FROM Ledgers l2
        WHERE l2.Acid = l.Acid
          AND l2.[Date] >= CAST(@Date AS DATE)
          AND l2.[Date] < DATEADD(DAY, 1, CAST(@Date AS DATE))
        ORDER BY l2.EntryDateTime DESC
    ) location
    LEFT JOIN OrderSummary os 
        ON os.Acid = l.Acid 
     AND CAST(l.[Date] AS DATE) = os.[OnlyDate]   -- join on date only
    WHERE l.[Date] >= CAST(@Date AS DATE)
      AND l.[Date] < DATEADD(DAY, 1, CAST(@Date AS DATE))
    GROUP BY 
        l.acid,
        os.FitOrderAmount,
        os.OtherOrderAmount,
        location.Latitude,
        location.Longitude,
        location.Address
)
,
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
LimitData AS (
    SELECT ID, CreditDays, CreditLimit
    FROM COA
),
Promise AS (
    SELECT acid, remarks
    FROM (
        SELECT acid, remarks,
               ROW_NUMBER() OVER (PARTITION BY acid ORDER BY [datetime] DESC) AS rn
        FROM spoWorking
        WHERE CAST([datetime] AS DATE) = CAST(@Date AS DATE)
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
    WHERE L.[Date] >= DATEADD(DAY, -ISNULL(COA.CreditDays, 0), @Date)
    GROUP BY L.ACID
),
-- Transactions in credit days window
RecentActivity AS (
    SELECT 
        L.ACID,
        SUM(CASE WHEN L.Debit > 0 THEN L.Debit ELSE 0 END) AS DebitsWithinCredit,
        SUM(CASE WHEN L.Credit > 0 THEN L.Credit ELSE 0 END) AS CreditsWithinCredit
    FROM Ledgers L
    INNER JOIN COA C ON L.ACID = C.ID
    WHERE L.[Date] >= DATEADD(DAY, -C.CreditDays, GETDATE())
    GROUP BY L.ACID
),

-- Overdue calculation
OverdueData AS (
    SELECT 
        TB.ACID,
        CASE 
            WHEN COA.CreditDays IS NULL OR COA.CreditDays = 0 THEN 
                (ISNULL(TB.TotalDebit,0) - ISNULL(TB.TotalCredit,0))
            ELSE 
                (ISNULL(TB.TotalDebit,0) - ISNULL(TB.TotalCredit,0))
                - ISNULL(RA.DebitsWithinCredit,0)
                -- + ISNULL(RA.CreditsWithinCredit,0)
        END AS Overdue
    FROM TotalBalance TB
    INNER JOIN COA ON TB.ACID = COA.ID
    LEFT JOIN RecentActivity RA ON TB.ACID = RA.ACID
)

SELECT 
    B.*,
    T.time,
    ISNULL(R.Recovery, 0) AS Recovery,
    LD.[Last Sale] AS Sale,
    LD.[Sale Date],
    LR.[Last Recovery] AS lrecovery,
    LR.[Recovery Date],
    T.payment,
    T.FitOrderAmount,
    T.OtherOrderAmount,
    t.latitude,
    t.longitude,
    t.address,
    L.CreditDays AS [Credit Days],
    L.CreditLimit AS [Credit Limit],
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
ORDER BY o.overdue DESC;
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
    const { acid } = req.query;

    if (!acid) {
      return res
        .status(400)
        .send({ status: "error", message: "Missing 'acid' parameter" });
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

      res.status(200).send(result.recordset);
    } catch (err) {
      res.status(500).send({ status: "failed", message: err });
    }
  },

  getTodayPayment: async (req, res) => {},
};
module.exports = { TurnoverMethods };
