const sql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection

const BalanceController = {
  getBalance: async (req, res) => {
    const { acid, date } = req.query; // get from query parameters

    if (!acid || !date) {
      return res.status(400).json({ error: "acid and date are required" });
    }

    try {
      // Assume you have a connected pool
      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid) // adjust type accordingly
        .input("date", sql.Date, date) // adjust type accordingly
        .query(`
        SELECT 
          SUM(ISNULL(debit, 0)) - SUM(ISNULL(credit, 0)) AS balance
        FROM ledgers
        WHERE acid = @acid AND date <= @date
      `);

      const balance = result.recordset[0]?.balance ?? 0;

      res.json({ balance });
    } catch (error) {
      console.error("DB error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  },

  getOverDue: async (req, res) => {
    const { acid, date } = req.query; // get from query parameters

    if (!acid || !date) {
      return res.status(400).json({ error: "acid and date are required" });
    }

    try {
      // Assume you have a connected pool
      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("acid", sql.VarChar, acid)
        .input("date", sql.Date, date).query(`
    WITH RecentActivity AS (
        SELECT 
            L.ACID,
            SUM(CASE WHEN L.Debit > 0 THEN L.Debit ELSE 0 END) AS DebitsWithinCredit,
            SUM(CASE WHEN L.Credit > 0 THEN L.Credit ELSE 0 END) AS CreditsWithinCredit
        FROM Ledgers L
        INNER JOIN COA C ON L.ACID = C.ID
        WHERE L.[Date] >= DATEADD(DAY, -C.CreditDays, @date)
          AND L.ACID = @acid
        GROUP BY L.ACID
    ),
    TotalBalance AS (
        SELECT 
            L.ACID,
            SUM(L.Debit) AS TotalDebit,
            SUM(L.Credit) AS TotalCredit
        FROM Ledgers L
        WHERE L.ACID = @acid
        GROUP BY L.ACID
    ),
    OverdueData AS (
        SELECT 
            TB.ACID,
            CASE 
                WHEN COA.CreditDays IS NULL OR COA.CreditDays = 0 THEN 
                    (ISNULL(TB.TotalDebit,0) - ISNULL(TB.TotalCredit,0))
                ELSE 
                    (ISNULL(TB.TotalDebit,0) - ISNULL(TB.TotalCredit,0))
                    - ISNULL(RA.DebitsWithinCredit,0)
                    -- + ISNULL(RA.CreditsWithinCredit,0) -- uncomment if you want credits within period too
            END AS Overdue
        FROM TotalBalance TB
        INNER JOIN COA ON TB.ACID = COA.ID
        LEFT JOIN RecentActivity RA ON TB.ACID = RA.ACID
    )
    SELECT ISNULL(ROUND(Overdue,0),0) AS OverDue
    FROM OverdueData;
`);

      const overDue = result.recordset[0]?.OverDue ?? null;

      res.json({ overDue });
    } catch (error) {
      console.error("DB error:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  },
};

module.exports = BalanceController;
