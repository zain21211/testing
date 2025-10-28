const sql = require("mssql");
const dbConnection = require("../database/connection");
const getPakistanISODateString = require("../utils/PakTime");

// Payment and expense configurations
const paymentModes = {
  cash: {
    type: "CRV",
    debitAcid: 1,
    narrationPrefix: "Pending - Cash Recd. by",
  },
  jazzcash: {
    type: "BRV",
    debitAcid: 1983,
    narrationPrefix: "Pending - JazzCash Recd. by",
  },
  easypaisa: {
    type: "BRV",
    debitAcid: 1982,
    narrationPrefix: "Pending - EasyPaisa Recd. by",
  },
  mbl: {
    type: "BRV",
    debitAcid: 326,
    narrationPrefix: "Pending - OnLine Recd. by",
  },
  crownone: {
    type: "BRV",
    debitAcid: 1946,
    narrationPrefix: "Pending -  Lifan Wallet Amount Recd. by",
  },
  online: {
    type: "BRV",
    debitAcid: 787,
    narrationPrefix: "Pending -  Direct Online Amount Recd. by",
  },
};

const expenseMethods = {
  petrol: {
    type: "CPV",
    getDebitAcid: (userTypeString) =>
      userTypeString?.toLowerCase().includes("sr") ? 685 : 845,
    narrationPrefix: "PETROL: CASH PAID BY",
  },
  entertainment: {
    type: "CPV",
    getDebitAcid: () => 696,
    narrationPrefix: "ENTERTAINMENT: CASH PAID BY",
  },
  zaqat: {
    type: "CPV",
    getDebitAcid: () => 677,
    narrationPrefix: "ZAQAT: CASH PAID BY",
  },
  localpetrol: {
    type: "CPV",
    getDebitAcid: () => 779,
    narrationPrefix: "PETROL: CASH PAID BY",
  },
  localpurchase: {
    type: "CPV",
    getDebitAcid: () => 632,
    narrationPrefix: "PURCHASE: CASH PAID BY",
  },
  bilty: {
    type: "CPV",
    getDebitAcid: () => 641,
    narrationPrefix: "BILTY: CASH PAID BY",
  },
  toll: {
    type: "CPV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString?.toLowerCase() || "";
      return typeLower.includes("sr")
        ? 685
        : typeLower.includes("kr")
        ? 845
        : "";
    },
    narrationPrefix: "TOLL: CASH PAID BY",
  },
  salary: {
    type: "CPV",
    getDebitAcid: (_, username) => {
      const nameLower = username?.toLowerCase() || "";
      return nameLower.includes("arif")
        ? 667
        : nameLower.includes("salman")
        ? 670
        : "";
    },
    narrationPrefix: "SALARY: CASH PAID BY",
  },
  salesbonus: {
    type: "CPV",
    getDebitAcid: (_, username) => {
      const nameLower = username?.toLowerCase() || "";
      return nameLower.includes("arif") || nameLower.includes("salman")
        ? 2126
        : "";
    },
    narrationPrefix: "BONUS: CASH PAID BY",
  },
  exp: {
    type: "CPV",
    getDebitAcid: (_, username) => {
      const nameLower = username?.toLowerCase() || "";
      return nameLower.includes("arif")
        ? 1009
        : nameLower.includes("salman")
        ? 1162
        : "";
    },
    narrationPrefix: "EXP: CASH PAID BY",
  },
  repair: {
    type: "CPV",
    getDebitAcid: (userTypeString) => {
      const typeLower = userTypeString?.toLowerCase() || "";
      return typeLower.includes("sr")
        ? 686
        : typeLower.includes("operator")
        ? 695
        : 2123;
    },
    narrationPrefix: "REPAIR: CASH PAID BY",
  },
};

// Helper functions
const validateInputs = (reqBody) => {
  const { paymentMethod, custId, receivedAmount, userName, creditID, debitID } =
    reqBody;

  if (
    !paymentMethod ||
    !custId ||
    !receivedAmount ||
    !userName ||
    !creditID ||
    !debitID
  ) {
    throw new Error(
      "PaymentMethod, custId, receivedAmount, userName, creditID, and debitID are required."
    );
  }
};

const getMethodConfig = (
  paymentMethod,
  expenseMethod,
  userType,
  userName,
  desc
) => {
  const lowerExpenseMethod = expenseMethod?.toLowerCase();
  const expenseConfig = lowerExpenseMethod
    ? expenseMethods[lowerExpenseMethod]
    : null;

  if (expenseConfig) {
    if (typeof expenseConfig.getDebitAcid !== "function") {
      throw new Error(
        `Configuration error: getDebitAcid is not a function for expenseMethod ${expenseMethod}`
      );
    }

    if (
      ["petrol", "toll", "repair"].includes(lowerExpenseMethod) &&
      !userType
    ) {
      throw new Error(
        `UserType is required for expense method: ${expenseMethod}`
      );
    }

    return {
      type: expenseConfig.type,
      debitAcid: expenseConfig.getDebitAcid(userType, userName),
      narration: `${expenseConfig.narrationPrefix} ${userName}`,
    };
  }

  const lowerPaymentMethod = paymentMethod.toLowerCase();
  const paymentConfig = paymentModes[lowerPaymentMethod];

  if (!paymentConfig) {
    throw new Error("Invalid payment or expense method.");
  }

  return {
    type: paymentConfig.type,
    debitAcid: paymentConfig.debitAcid,
    narration: `${paymentConfig.narrationPrefix} ${userName} ${desc}`,
  };
};

const getNextDocNumber = async (pool, type) => {
  const result = await pool.request().input("type", sql.VarChar, type).query(`
      UPDATE DocNumber
      SET doc = doc + 1
      OUTPUT DELETED.doc
      WHERE type = @type
    `);

  return result.recordset[0].doc;
};

const checkDuplicateTransactions = async (transaction, creditID, debitID) => {
  const result = await transaction
    .request()
    .input("creditID", sql.VarChar, creditID)
    .input("debitID", sql.VarChar, debitID).query(`
      SELECT 1 FROM ledgers 
      WHERE transactionID IN (@creditID, @debitID)
    `);

  return result.recordset.length > 0;
};

const insertLedgerEntries = async (
  transaction,
  effectiveDate,
  type,
  doc,
  custId,
  debitAcid,
  amount,
  narration,
  userName,
  location,
  creditID,
  debitID,
  systemTimestamp
) => {
  const { latitude, longitude, address } = location;
  const dateOnly = effectiveDate.split("T")[0];

  await transaction
    .request()
    .input("effDate", sql.VarChar, dateOnly)
    .input("type", sql.VarChar, type)
    .input("doc", sql.Int, doc)
    .input("custId", sql.Int, custId)
    .input("debitAcid", sql.Int, debitAcid)
    .input("amount", sql.Decimal(18, 2), amount)
    .input("narration", sql.VarChar, narration)
    .input("userName", sql.VarChar, userName)
    .input("latitude", sql.Float, latitude)
    .input("longitude", sql.Float, longitude)
    .input("address", sql.VarChar, address)
    .input("systemTimestamp", sql.VarChar, systemTimestamp)
    .input("creditID", sql.VarChar, creditID)
    .input("debitID", sql.VarChar, debitID).query(`
      INSERT INTO ledgers 
      (address, latitude, longitude, date, type, doc, acid, credit, NARRATION, EntryBy, EntryDateTime, transactionID)
      VALUES 
      (@address, @latitude, @longitude, @effDate, @type, @doc, @custId, @amount, @narration, @userName, @systemTimestamp, @creditID);
      
      INSERT INTO ledgers 
      (address, latitude, longitude, date, type, doc, acid, debit, NARRATION, EntryBy, EntryDateTime, transactionID)
      VALUES 
      (@address, @latitude, @longitude, @effDate, @type, @doc, @debitAcid, @amount, @narration, @userName, @systemTimestamp, @debitID);
    `);
};

// Main controller
const CashEntryController = {
  insertEntry: async (req, res) => {
    let pool;
    let transaction;

    try {
      // Validate inputs
      validateInputs(req.body);

      const {
        creditID,
        debitID,
        paymentMethod,
        custId,
        receivedAmount,
        userName,
        userType,
        expenseMethod,
        desc = "",
        time,
        location,
      } = req.body;

      const effectiveDate = getPakistanISODateString(time);
      const systemTimestamp = getPakistanISODateString();

      // Get method configuration
      const methodConfig = getMethodConfig(
        paymentMethod,
        expenseMethod,
        userType,
        userName,
        desc
      );

      // Get database connection
      pool = await dbConnection();

      // Get next document number
      const nextDoc = await getNextDocNumber(pool, methodConfig.type);

      // Start transaction
      transaction = new sql.Transaction(pool);
      await transaction.begin();

      // Check for duplicate transactions
      if (await checkDuplicateTransactions(transaction, creditID, debitID)) {
        await transaction.rollback();
        return res.status(400).json({ error: "Duplicate transaction IDs" });
      }

      // Insert ledger entries
      await insertLedgerEntries(
        transaction,
        effectiveDate,
        methodConfig.type,
        nextDoc,
        custId,
        methodConfig.debitAcid,
        receivedAmount,
        methodConfig.narration,
        userName,
        location,
        creditID,
        debitID,
        systemTimestamp
      );

      // Commit transaction
      await transaction.commit();

      res.json({ success: true, doc: nextDoc });
    } catch (error) {
      console.error("Insert Entry Error:", error);

      // Rollback transaction if active
      if (transaction && !transaction._rolledBack) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error("Rollback Error:", rollbackError);
        }
      }

      res.status(500).json({
        error: error.message || "Internal server error",
        details: error.toString(),
      });
    } finally {
      // // Close connection if it was opened
      // if (pool && pool.connected) {
      //   try {
      //     await pool.close();
      //   } catch (closeError) {
      //     console.error("Connection Close Error:", closeError);
      //   }
      // }
    }
  },
};

module.exports = CashEntryController;
