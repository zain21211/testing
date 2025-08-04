const sql = require("mssql");
const connection = require("../database/connection"); // Update path as needed

const byUser = {
  getDebitCusts: async (req, res) => {
    const { username } = req.query; // or use req.query.username if it's from URL
    console.log("Fetching debit customers for username:", username);
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    try {
      const pool = await connection();
      const result = await pool
        .request()
        .input("username", sql.VarChar, username).query(`
        SELECT 
        dc.acid,
        AC.subsidary as name,
        AC.route,
        AC.UrduName
        FROM DEBITAccounts dc
        join coa AC 
        on dc.acid = AC.id
         WHERE dc.username = @username
        `);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "Account not found" });
      }
      const response = result.recordset;
      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching account ID:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  getCreditCusts: async (req, res) => {
    const { username } = req.query; // or use req.query.username if it's from URL
    console.log("Fetching credit customers for username:", username);

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    try {
      const pool = await connection();
      const result = await pool
        .request()
        .input("username", sql.VarChar, username).query(`
        SELECT distinct
        ca.acid,
        AC.subsidary as name,
        AC.route,
        AC.UrduName
        FROM CreditAccounts ca
        join coa AC 
        on ca.acid = AC.id
        WHERE username = @username
        `);

      const response = result.recordset;
      console.log(response);
      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "Account not found" });
      }

      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching account ID:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  post: async (req, res) => {
    const { date, accounts, amount, description, entryDateTime, user } =
      req.body;

      console.log(accounts)
    const time = new Date(entryDateTime);
    time.setHours(time.getHours() + 5);

    try {
      const pool = await connection();

      const docResult = await pool
        .request()
        .input("type", sql.VarChar, "BPV")
        .query(
          "SELECT ISNULL(MAX(doc), 0) + 1 AS nextDoc FROM ledgers WHERE type = @type"
        );
      const nextDoc = docResult.recordset[0].nextDoc;

      let query;

      for (let i = 0; i < accounts.length; i++) {
        if (accounts[i].type === "debit") {
          query = `
        INSERT INTO ledgers 
          (date, acid, type, doc, debit, narration, EntryDateTime, EntryBy, ReceiptStatus, WhatsappStatus)
        VALUES 
          (@DATE, @ACID, 'BPV', @DOC, @AMOUNT, @Narration, @EntryDateTime, @UserName, 'PAID', 'DONE')
      `;
        } else {
          query = `
        INSERT INTO ledgers 
          (date, acid, type, doc, credit, narration, EntryDateTime, EntryBy, ReceiptStatus, WhatsappStatus)
        VALUES 
          (@DATE, @ACID, 'BPV', @DOC, @AMOUNT, @Narration, @EntryDateTime, @UserName, 'RECIEVED', 'DONE')
      `;
        }

        const result = await pool
          .request()
          .input("DATE", sql.Date, date)
          .input("ACID", sql.Int, accounts[i].acid)
          .input("DOC", sql.Int, nextDoc)
          .input("AMOUNT", sql.Decimal(18, 2), amount)
          .input("Narration", sql.NVarChar(sql.MAX), description)
          .input("EntryDateTime", sql.DateTime, time)
          .input("UserName", sql.VarChar(50), user)
          .query(query);
      }
      res.status(200).json({
        success: true,
        message: "Ledger entry inserted",
        // rowsAffected: result.rowsAffected,
      });
    } catch (err) {
      console.error("Ledger Insert Error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to insert ledger entry" });
    }
  },
};

module.exports = byUser;
