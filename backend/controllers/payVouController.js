const sql = require("mssql");
const connection = require("../database/connection"); // Update path as needed

const byUser = {
  getDebitCusts: async (req, res) => {
    const { username } = req.query; // or use req.query.username if it's from URL
    console.log("Fetching debit customers for username:", req.user);
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

    const time = new Date(entryDateTime);
    time.setHours(time.getHours() + 5);

    try {
      const pool = await connection();

      if (!Array.isArray(accounts) || accounts.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Accounts array is required and cannot be empty",
        });
      }

      let debitDoc = null;
      let creditDoc = null;
      let bothDoc = null;
      let docType;

      if (accounts.length === 1 && accounts[0].type === "debit") {
        docType = "CPV";
        const debitRes = await pool
          .request()
          .input("type", sql.VarChar, docType)
          .query(
            ` UPDATE DocNumber
            SET doc = doc + 1
            OUTPUT DELETED.doc 
            WHERE type = @type`
          );
        debitDoc = debitRes.recordset[0].doc;
      } else if (accounts.length === 1 && accounts[0].type === "credit") {
        docType = "CRV";
        const creditRes = await pool
          .request()
          .input("type", sql.VarChar, docType)
          .query(
            ` UPDATE DocNumber
            SET doc = doc + 1
            OUTPUT DELETED.doc 
            WHERE type = @type`
          );
        creditDoc = creditRes.recordset[0].doc;
      } else {
        docType = "BRV";
        const bothRes = await pool
          .request()
          .input("type", sql.VarChar, "BRV")
          .query(
            ` UPDATE DocNumber
            SET doc = doc + 1
            OUTPUT DELETED.doc
            WHERE type = @type`
          );
        bothDoc = bothRes.recordset[0].doc;
      }

      const doc = bothDoc || debitDoc || creditDoc;

      console.log(
        "Debit Doc:",
        debitDoc,
        "Credit Doc:",
        creditDoc,
        "Both Doc:",
        bothDoc
      );
      let query;

      for (let i = 0; i < accounts.length; i++) {
        if (accounts[i].type === "debit") {
          query = `
        INSERT INTO ledgers 
          (date, acid, type, doc, debit, narration, EntryDateTime, EntryBy, ReceiptStatus, WhatsappStatus)
        VALUES 
          (@DATE, @ACID, @type, @DOC, @AMOUNT, @Narration, @EntryDateTime, @UserName, 'PAID', 'DONE')
      `;
        } else {
          query = `
        INSERT INTO ledgers 
          (date, acid, type, doc, credit, narration, EntryDateTime, EntryBy, ReceiptStatus, WhatsappStatus)
        VALUES 
          (@DATE, @ACID, @type, @DOC, @AMOUNT, @Narration, @EntryDateTime, @UserName, 'RECIEVED', 'DONE')
      `;
        }

        await pool
          .request()
          .input("DOC", sql.Int, doc)
          .input("DATE", sql.Date, date)
          .input("type", sql.VarChar(50), docType)
          .input("UserName", sql.VarChar(50), user)
          .input("ACID", sql.Int, accounts[i].acid)
          .input("EntryDateTime", sql.DateTime, time)
          .input("AMOUNT", sql.Decimal(18, 2), amount)
          .input("Narration", sql.NVarChar(sql.MAX), description)
          .query(query);

        if (accounts.length === 1) {
          return res.status(200).json({
            debitDoc,
            creditDoc,
            success: true,
            message: "Ledger entry inserted",
          });
        }
      }
      res.status(200).json({
        success: true,
        message: "Ledger entry inserted",
        // rowsAffected: result.rowsAffected,
      });
    } catch (err) {
      console.error("Ledger Insert Error:", err);
      res.status(500).json({
        msg: "Server error",
        // doc: { creditDoc: creditDoc ?? null, debitDoc: debitDoc ?? null },
        success: false,
        error: err.message,
      });
    }
  },
};

module.exports = byUser;
