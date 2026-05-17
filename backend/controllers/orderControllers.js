// orderControllers.js
const sql = require("mssql");
const dbConnection = require("../database/connection");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const getPakistanISODateString = require("../utils/PakTime");
const logFile = path.join(__dirname, "..", "order_debug.log");

function logToFile(data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}\n`;
  fs.appendFileSync(logFile, logMessage);
}

// to get the doc number
const getNextDocNumber = async (poolOrTransaction, type) => {
  const result = await poolOrTransaction.request().input("type", sql.VarChar, type).query(`
      UPDATE DocNumber
      SET doc = doc + 1
      OUTPUT DELETED.doc
      WHERE type = @type
    `);

  return result.recordset[0].doc;
};
// Helper: safe get pool
const getPool = async () => {
  const pool = await dbConnection();
  if (!pool) throw new Error("Failed to obtain DB pool");
  return pool;
};

// Helper to calculate today's total sales
const calculateTodaySales = async (pool) => {
  try {
    const result = await pool
      .request()
      .query(`
        SELECT ISNULL(SUM(Amount), 0) AS total 
        FROM PSDetail 
        WHERE (Type = 'SALE' OR Type = 'sale') 
          AND Status = 'INVOICE' 
          AND CAST(Date AS DATE) = CAST(GETDATE() AS DATE)
      `);
    return result.recordset[0].total || 0;
  } catch (err) {
    console.error("Error calculating today sales:", err);
    return 0;
  }
};

// Helper to calculate today's total pending orders (NULL or ESTIMATE)
const calculateTodayPendingOrders = async (pool) => {
  try {
    const result = await pool
      .request()
      .query(`
        SELECT ISNULL(SUM(Amount), 0) AS total 
        FROM PSDetail 
        WHERE (Type = 'SALE' OR Type = 'sale') 
          AND (Status IS NULL OR Status <> 'INVOICE')
          AND CAST(Date AS DATE) = CAST(GETDATE() AS DATE)
      `);
    return result.recordset[0].total || 0;
  } catch (err) {
    console.error("Error calculating pending orders:", err);
    return 0;
  }
};

// to get the updated products
const getProducts = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT *
      FROM Products
      ORDER BY Name;
    `);
    return result.recordset;
  } catch (err) {
    console.error("Error fetching products:", err);
    throw err;
  }
};

// to check for duplicate
const checkDuplicate = async (transactionid) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("transactionId", sql.VarChar, transactionid)
      .query(`
      SELECT Doc
      FROM ledgers
      WHERE transactionId = @transactionId + '-DR';
    `);

    if (result.recordset.length > 0) {
      return { duplicate: true, doc: result.recordset[0].Doc };
    }
    return { duplicate: false };
  } catch (err) {
    console.error("Error fetching duplicate:", err);
    throw err;
  }
};

const updateStock = async (id, qty, columnName) => {
  try {
    const pool = await getPool();

    // Validate column name to prevent SQL injection
    const allowedColumns = ["stockqty", "claimStock"];
    if (!allowedColumns.includes(columnName)) {
      throw new Error(`Invalid column name: ${columnName}`);
    }

    const query = `
      UPDATE Products
      SET ${columnName} = ISNULL(${columnName}, 0) - @qty
      WHERE id = @id
    `;

    const result = await pool
      .request()
      .input("qty", sql.Int, qty)
      .input("id", sql.Int, id)
      .query(query);

    return result;
  } catch (err) {
    console.error("❌ Failed to update stock:", err.message || err);
    throw err;
  }
};


const orderControllers = {
  postOrder: async (req, res) => {
    const startTime = Date.now();
    const {
      // nextDoc,
      orderDate,
      customerAcid,
      username,
      userType,
      status,
      totalAmount,
      products: linesJson,
      salesRevenueAcid,
      transactionID,
    } = req.body;

    const now = new Date();
    const date = now.toISOString().split("T")[0]; // 2025-11-03
    const time = now.toTimeString().split(" ")[0]; // 16:45:51
    const description = `SV KR ${date} ${time} ${username}`;

    logToFile(`📥 NEW ORDER ATTEMPT - CID: ${customerAcid}, Total: ${totalAmount}`);
    logToFile({ payload: { customerAcid, totalAmount, orderDate, productsCount: linesJson?.length } });
    console.log("📥 Received postOrder payload:", JSON.stringify({ customerAcid, totalAmount, orderDate, productsCount: linesJson?.length }));
    let pool, transaction;
    try {
      pool = await getPool();

      // Safety defaults
      const safeUsername = username || "unknown_user";
      const safeUserType = userType || "STAFF";
      const safeSalesRevenueAcid = salesRevenueAcid || 4;
      const safeTransactionID = transactionID || `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const duplicateInfo = await checkDuplicate(safeTransactionID);
      if (duplicateInfo.duplicate) {
        return res.status(200).json({ 
          message: "Duplicate document number found.", 
          doc: duplicateInfo.doc,
          isDuplicate: true
        });
      }

      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const nextDoc = await getNextDocNumber(transaction, "sale");
      const nextDocNum = parseInt(nextDoc);
      if (isNaN(nextDocNum)) throw new Error(`Invalid Doc Number generated: ${nextDoc}`);

      const parsedLines = JSON.parse(JSON.stringify(linesJson || []));
      if (!parsedLines.length) throw new Error("No items found in order.");

      // ✅ 1. Insert into PsProduct (batch insert)
      try {
        for (const item of parsedLines) {
          const {
            prid,
            acid,
            qty,
            rate,
            suggestedPrice,
            vest,
            discP1,
            discP2,
            vist,
            SchPc,
            sch,
            isClaim,
            profit,
            spo,
          } = item;

          await transaction.request()
            .input("date", sql.DateTime, new Date(orderDate))
            .input("prid", sql.Int, parseInt(prid) || 0)
            .input("acid", sql.Int, parseInt(acid) || 0)
            .input("qty", sql.Int, parseInt(qty) || 0)
            .input("aQty", sql.Int, parseInt(qty) || 0)
            .input("bQty", sql.Int, parseInt(qty) || 0)
            .input("rate", sql.Decimal(18, 2), parseFloat(rate) || 0)
            .input("suggestedPrice", sql.Decimal(18, 2), parseFloat(suggestedPrice) || 0)
            .input("vest", sql.Decimal(18, 2), parseFloat(vest) || 0)
            .input("discP1", sql.Decimal(18, 2), parseFloat(discP1) || 0)
            .input("discP2", sql.Decimal(18, 2), parseFloat(discP2) || 0)
            .input("vist", sql.Decimal(18, 2), parseFloat(vist) || 0)
            .input("SchPc", sql.Int, parseInt(SchPc) || 0)
            .input("sch", sql.Int, sch ? 1 : 0)
            .input("isClaim", sql.Int, isClaim ? 1 : 0)
            .input("spo", sql.VarChar(255), String(spo || ""))
            .input("profit", sql.Decimal(18, 2), parseFloat(profit) || 0)
            .input("doc", sql.Int, nextDocNum)
            .input("username", sql.VarChar(50), safeUsername).query(`
            INSERT INTO PsProduct
            ([Date],[Type],[Doc],[Type2],[Prid],[Acid],[Qty2],[AQty],[Qty],[Rate],
             [SuggestedRate],[VEST],[DiscP],[Discount],[DiscP2],[Discount2],[VIST],
             [SellingType],[SchPc],[Sch],[department],[isclaim],[SPO],[profit], [EntryBy])
            VALUES
            (@date,'SALE',@doc,'OUT',@prid,@acid,0,@aQty,@bQty,@rate,
             @suggestedPrice,@vest,@discP1,
             (ISNULL(@discP1,0)/100)*ISNULL(@rate,0)*ISNULL(@qty,0),
             @discP2,
             (ISNULL(@discP2,0)/100)*ISNULL(@rate,0)*ISNULL(@qty,0),
             @vist,'DEFAULT',@SchPc,@sch,'A1',@isClaim,@spo,@profit, @username)
          `);
        }
      } catch (e) {
        throw new Error(`Step 1 (PsProduct) failed for Doc ${nextDocNum}: ${e.message}`);
      }

      // ✅ 2. Update stock (normal + claim)
      try {
        const stockReq = transaction.request();
        await stockReq
          .input("nextDoc", sql.Int, nextDocNum)
          .query(`
          UPDATE p
          SET p.stockqty = ISNULL(p.stockqty,0) - sub.totalQty
          FROM Products p
          JOIN (
            SELECT prid, SUM(ISNULL(AQTY,0) + ISNULL(SchPc,0)) AS totalQty
            FROM PsProduct WHERE Doc=@nextDoc AND Type='SALE' AND ISNULL(isclaim,0)=0
            GROUP BY prid
          ) sub ON p.id = sub.prid;

          UPDATE p
          SET p.claimStock = ISNULL(p.claimStock,0) - sub.totalQty
          FROM Products p
          JOIN (
            SELECT prid, SUM(ISNULL(AQTY,0) + ISNULL(SchPc,0)) AS totalQty
            FROM PsProduct WHERE Doc=@nextDoc AND Type='SALE' AND ISNULL(isclaim,0)=1
            GROUP BY prid
          ) sub ON p.id = sub.prid;
        `);
      } catch (e) {
        throw new Error(`Step 2 (UpdateStock) failed: ${e.message}`);
      }

      // ✅ 3. Insert into psproductHistory
      try {
        await transaction.request()
          .input("doc", sql.Int, nextDocNum)
          .input("username", sql.VarChar(50), safeUsername)
          .input("userType", sql.VarChar(50), safeUserType)
          .input("orderDate", sql.DateTime, new Date(orderDate)).query(`
          INSERT INTO psproductHistory (Doc, UserName, UserLevel, Date, EntryDate, EntryStatus)
          VALUES (@doc, @username, @userType, @orderDate, @orderDate, 'SAVE')
        `);
      } catch (e) {
        throw new Error(`Step 3 (History) failed: ${e.message}`);
      }

      const dueDate = new Date();

      // ✅ 4. Insert into PSDetail
      try {
        const custAcid = parseInt(customerAcid);
        if (isNaN(custAcid)) throw new Error(`Invalid Customer Acid: ${customerAcid}`);

        const detailReq = transaction.request();
        await detailReq
          .input("nextDoc", sql.Int, nextDocNum)
          .input("orderDate", sql.DateTime, new Date(orderDate))
          .input("customerAcid", sql.Int, custAcid)
          .input("description", sql.VarChar(255), description)
          .input("totalAmount", sql.Decimal(18, 2), parseFloat(totalAmount) || 0)
          .input("status", sql.VarChar(50), status)
          .input("dueDate", sql.DateTime, dueDate)
          .input("PBalance", sql.Int, 0)
          .input("FREIGHT", sql.Int, 0)
          .input("username", sql.VarChar(50), safeUsername).query(`
        INSERT INTO PSDetail
        (
          [Doc],
          [Date],
          [Type],
          [Acid],
          [Description],
          [Amount],
          [GrossProfit],
          [DueDate],
          [PBalance],
          [Status]
        )
        VALUES
        (
          @nextDoc,
          @orderDate,
          'SALE',
          @customerAcid,
          @description,
          @totalAmount,
          ISNULL((SELECT SUM(profit) FROM PsProduct WHERE Doc = @nextDoc), 0),
          @dueDate,
          @PBalance,
          @status
        )
      `);
      } catch (e) {
        throw new Error(`Step 4 (PSDetail) failed: ${e.message}`);
      }

      // ✅ 5. Insert into ledgers + ledgersHistory
      try {
        const custAcid = parseInt(customerAcid);
        const ledgerReq = transaction.request();
        await ledgerReq
          .input("doc", sql.Int, nextDocNum)
          .input("date", sql.DateTime, new Date(orderDate))
          .input("customerAcid", sql.Int, custAcid)
          .input("salesRevenueAcid", sql.Int, parseInt(safeSalesRevenueAcid))
          .input("description", sql.VarChar(255), description)
          .input("totalAmount", sql.Decimal(18, 2), parseFloat(totalAmount) || 0)
          .input("transactionID", sql.VarChar(100), safeTransactionID)
          .input("username", sql.VarChar(50), safeUsername).query(`
        -- 1. Debit Customer
        INSERT INTO ledgers (Date, Type, Doc, Acid, Debit, Credit, NARRATION, EntryBy, EntryDateTime, transactionId)
        VALUES (@date, 'SALE', @doc, @customerAcid, @totalAmount, 0, @description, @username, GETDATE(), @transactionID + '-DR');

        -- 2. Credit Sales Revenue
        INSERT INTO ledgers (Date, Type, Doc, Acid, Debit, Credit, NARRATION, EntryBy, EntryDateTime, transactionId)
        VALUES (@date, 'SALE', @doc, @salesRevenueAcid, 0, @totalAmount, @description, @username, GETDATE(), @transactionID + '-CR');

        -- 3. LedgersHistory
        INSERT INTO LedgersHistory (Doc, Date, Acid, Type, UserName, EntryStatus)
        VALUES (@doc, @date, @customerAcid, 'SALE', @username, 'SAVE');
      `);
      } catch (e) {
        throw new Error(`Step 5 (Ledgers) failed: ${e.message}`);
      }

      await transaction.commit();
      console.log(`✅ Order ${nextDocNum} committed to database.`);

      // Update Dashboard Metrics (Socket)
      try {
        const io = req.app.get("io");
        if (io) {
          const newSalesTotal = await calculateTodaySales(pool);
          io.emit("salesUpdated", { total: newSalesTotal });
          
          const newPendingTotal = await calculateTodayPendingOrders(pool);
          io.emit("pendingOrdersUpdated", { total: newPendingTotal });
          console.log("📊 Dashboard metrics updated via socket.");
        }
      } catch (socketErr) {
        console.warn("⚠️ Dashboard update failed, but order was saved:", socketErr.message);
        logToFile(`⚠️ Socket Update Error: ${socketErr.message}`);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      res.json({
        success: true,
        message: "Order posted successfully",
        duration,
        doc: nextDocNum,
      });
    } catch (error) {
      logToFile(`❌ postOrder Error: ${error.message}`);
      logToFile({ error_stack: error.stack });
      console.error("❌ postOrder Error detail:", error);
      if (transaction) {
        try {
          await transaction.rollback();
          logToFile("🔄 Transaction rolled back");
        } catch (rbErr) {
          logToFile(`❌ Rollback failed: ${rbErr.message}`);
        }
      }
      res.status(500).json({
        error: "Failed to create order",
        details: error.message,
        payload: { customerAcid, totalAmount, orderDate, transactionID }
      });
    }
  },

  getNextDoc: async (req, res) => {
    const { acid } = req.query;
    if (!acid)
      return res.status(400).json({ error: "acid (account ID) is required" });

    try {
      const pool = await getPool();

      const docResult = await pool
        .request()
        .input("acid", sql.VarChar(50), acid).query(`
          SELECT MAX(doc) AS nextDoc
          FROM psproduct
          WHERE acid = @acid AND type = 'sale' AND printStatus IS NULL
        `);

      const nextDoc = docResult.recordset?.[0]?.nextDoc ?? null;
      if (!nextDoc) {
        // no pending doc
        return res.status(200).json({ nextDoc: null, date: null, total: 0 });
      }

      const result = await pool.request().input("nextDoc", sql.Int, nextDoc)
        .query(`
          SELECT D.Date
          FROM PSDetail D
          WHERE D.doc = @nextDoc
        `);

      const resultTotal = await pool
        .request()
        .input("nextDoc", sql.Int, nextDoc).query(`
          SELECT SUM(ISNULL(VIST, 0)) AS TotalBillAmount
          FROM PsProduct
          WHERE TYPE = 'SALE' AND Doc = @nextDoc
        `);

      const rawDate = result.recordset?.[0]?.Date || null;
      const date = rawDate ? new Date(rawDate).toLocaleDateString() : null;
      const total = resultTotal.recordset?.[0]?.TotalBillAmount || 0;

      return res.json({ nextDoc, date, total });
    } catch (err) {
      console.error("Error in getNextDoc:", err);
      return res.status(500).json({
        error: "Failed to fetch nextDoc",
        msg: err && err.message ? err.message : err,
      });
    }
  },

  getCost: async (req, res) => {
    const { ItemCode } = req.query;
    const SearchDate = new Date();

    if (!ItemCode)
      return res.status(400).json({ error: "ItemCode is required" });

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input("ItemCode", sql.VarChar(100), ItemCode)
        .input("SearchDate", sql.Date, SearchDate).query(`
          SELECT round(ISNULL((
            SELECT
              CASE
                WHEN qty = 0 THEN 0
                ELSE amt / qty
              END AS Cost
            FROM (
              SELECT
                ISNULL(SUM(vist), 0) * ((100 - AVG(pd.ExtraDiscountP)) / 100) AS amt,
                ISNULL(SUM(qty), 0) + ISNULL(SUM(SchPc), 0) AS qty,
                AVG(pd.ExtraDiscountP) AS ExDisc
              FROM PSProduct p
              JOIN PSDetail pd ON p.doc = pd.doc AND p.type = pd.type
              WHERE
                p.type = 'purchase'
                AND prid = (SELECT id FROM Products WHERE code = @ItemCode)
                AND p.date = (
                  SELECT MAX(date)
                  FROM PSProduct ps
                  WHERE
                    ps.prid = (SELECT id FROM Products WHERE code = @ItemCode)
                    AND ps.date <= @SearchDate
                    AND ps.type = 'purchase'
                )
            ) x
          ), 0),3) AS Cost
          FROM Products
          WHERE code = @ItemCode
        `);

      const cost = result.recordset?.[0]?.Cost ?? 0;
      return res.json({ cost, SearchDate });
    } catch (err) {
      console.error("Error fetching cost:", err);
      return res.status(500).json({
        error: "Internal server error",
        msg: err && err.message ? err.message : err,
      });
    }
  },

  pendingItems: async (req, res) => {
    const { acid, company = "fit" } = req.query;

    if (!acid)
      return res.status(400).json({ error: "acid (account ID) is required" });

    try {
      const pool = await getPool();

      const result = await pool
        .request()
        .input("acid", sql.Int, acid)
        .input("company", sql.VarChar(50), company)
        .query(`
  SELECT
    ps.DATE,
    ps.DOC,
    ps.PRID AS productID,
    p.Name,
    p.category AS model,
    p.Company,
    ps.ACID AS customerID,
    0 AS isClaim,
    1 AS Sch,
    ps.QTY2 - ps.Qty AS orderQuantity,
    p.SaleRate,

    ISNULL(pd.DiscP, 0) AS DiscP,
    ISNULL(pd.DiscP2, 0) AS DiscP2,

    ROUND(p.SaleRate * ISNULL(pd.DiscP2, 0) / 100.0 * (ps.QTY2 - ps.QTY), 2) AS Discount2,

    ROUND(
      (p.SaleRate - (p.SaleRate * ISNULL(pd.DiscP2, 0) / 100.0))
      * ISNULL(pd.DiscP, 0) / 100.0
      * (ps.QTY2 - ps.QTY)
    , 2) AS Discount1,

    ISNULL((
      SELECT FLOOR(1.0 * (ps.QTY2 - ps.QTY) / NULLIF(slab.SchOn, 0)) * slab.SchPcs
      FROM SchQTYSlabs slab
      WHERE slab.PRID = ps.PRID
    ), 0) AS schPc,

    (ps.QTY2 - ps.QTY) +
    ISNULL((
      SELECT FLOOR(1.0 * (ps.QTY2 - ps.QTY) / NULLIF(slab.SchOn, 0)) * slab.SchPcs
      FROM SchQTYSlabs slab
      WHERE slab.PRID = ps.PRID
    ), 0) AS TotalQty,

    ROUND((
      (
        p.SaleRate
        * (1 - ISNULL(pd.DiscP, 0) / 100.0)
        * (1 - ISNULL(pd.DiscP2, 0) / 100.0)
      )
      * (ps.QTY2 - ps.QTY)
    ), 2) AS Amount,

    ROUND((
      (
        p.SaleRate
        * (1 - ISNULL(pd.DiscP, 0) / 100.0)
        * (1 - ISNULL(pd.DiscP2, 0) / 100.0)
      ) - ISNULL((
        SELECT TOP 1
          x.amt / NULLIF(x.qty, 0)
        FROM (
          SELECT
            ISNULL(SUM(pr.vist), 0) * ((100 - AVG(pd2.ExtraDiscountP)) / 100.0) AS amt,
            ISNULL(SUM(pr.qty), 0) + ISNULL(SUM(pr.SchPc), 0) AS qty
          FROM PSProduct pr
          JOIN PSDetail pd2 ON pr.doc = pd2.doc AND pr.type = pd2.type
          WHERE pr.type = 'purchase'
            AND pr.prid = ps.prid
            AND pr.date = (
              SELECT MAX(subpr.date)
              FROM PSProduct subpr
              WHERE subpr.prid = ps.prid
                AND subpr.date <= ps.date
                AND subpr.type = 'purchase'
            )
        ) AS x
      ), 0)
    ) *
    (
      (ps.QTY2 - ps.QTY) +
      ISNULL((
        SELECT FLOOR(1.0 * (ps.QTY2 - ps.QTY) / NULLIF(slab.SchOn, 0)) * slab.SchPcs
        FROM SchQTYSlabs slab
        WHERE slab.PRID = ps.PRID
      ), 0)
    ), 2) AS Profit

  FROM
    PsProduct ps
    JOIN Products p ON ps.prid = p.id
    JOIN coa a ON ps.acid = a.id
    OUTER APPLY (
      SELECT TOP 1 DiscP, DiscP2
      FROM PartyDiscount
      WHERE acid = ps.Acid AND company = p.Company
      ORDER BY Id DESC  -- Change to 'EffectiveDate DESC' if that column exists
    ) pd

  WHERE
    ps.TYPE = 'SALE'
    AND ps.ACID = @acid
    AND ps.QTY < ps.QTY2
    AND ps.DATE = (
      SELECT MAX(date)
      FROM PsProduct
      WHERE acid = @acid
      AND qty < qty2
    );
`);


      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error("Pending Order Summary Error:", error);
      return res.status(500).json({
        error: "Server error",
        details: error && error.message ? error.message : error,
      });
    }
  },

  getTodayTotalPending: async (req, res) => {
    try {
      const pool = await getPool();
      const total = await calculateTodayPendingOrders(pool);
      res.json({ success: true, total });
    } catch (error) {
      console.error("Error fetching today pending orders:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  },

  getAllSchemes: async (req, res) => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT s.*, p.code 
        FROM SchQTYSlabs s
        JOIN Products p ON s.PRID = p.ID
      `);
      res.json(result.recordset);
    } catch (error) {
      console.error("Error fetching all schemes:", error);
      res.status(500).json({ error: "Failed to fetch schemes" });
    }
  },
};

module.exports = orderControllers;
