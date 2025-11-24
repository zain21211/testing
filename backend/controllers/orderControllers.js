// orderControllers.js
const sql = require("mssql");
const dbConnection = require("../database/connection");
const jwt = require("jsonwebtoken");

// to get the doc number
const getNextDocNumber = async (pool, type) => {
  const result = await pool.request().input("type", sql.VarChar, type).query(`
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
      .input("transactionid", sql.VarChar, transactionid)
      .query(`
      SELECT 1
      FROM ledgers
      where transactionid=@transactionid;
    `);

    const duplicate = result.recordset > 0;
    return duplicate;
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
    const startTime = performance.now();
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

    let pool, transaction;
    try {
      pool = await getPool();
      const nextDoc = await getNextDocNumber(pool, "sale");
      const duplicate = await checkDuplicate(transactionID);

      if (duplicate) return res.status(204).json({ message: "Duplicate document number found." });

      transaction = new sql.Transaction(pool);
      await transaction.begin();

      const parsedLines = JSON.parse(JSON.stringify(linesJson || []));
      if (!parsedLines.length) throw new Error("No items found in order.");

      // ✅ 1. Insert into PsProduct (batch insert)a
      const psProductInserts = parsedLines.map((item) => {
        const {
          prid,
          acid,
          qty,
          aQty,
          bQty,
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

        return pool
          .request()
          .input("date", sql.VarChar(50), orderDate)
          .input("prid", sql.Int, prid)
          .input("acid", sql.Int, acid)
          .input("qty", sql.Int, qty)
          .input("aQty", sql.Int, aQty)
          .input("bQty", sql.Int, bQty)
          .input("rate", sql.Decimal(18, 2), suggestedPrice)
          .input("suggestedPrice", sql.Decimal(18, 2), suggestedPrice)
          .input("vest", sql.Decimal(18, 2), vest)
          .input("discP1", sql.Decimal(18, 2), discP1)
          .input("discP2", sql.Decimal(18, 2), discP2)
          .input("vist", sql.Decimal(18, 2), vist)
          .input("SchPc", sql.Int, SchPc)
          .input("sch", sql.Int, sch)
          .input("isClaim", sql.Bit, isClaim)
          .input("spo", sql.VarChar(255), spo)
          .input("profit", sql.Decimal(18, 2), profit)
          .input("doc", sql.Int, parseInt(nextDoc))
          .input("username", sql.VarChar(50), username).query(`
          INSERT INTO PsProduct
          ([Date],[Type],[Doc],[Type2],[Prid],[Acid],[Qty2],[AQTY],[Qty],[Rate],
           [SuggestedRate],[VEST],[DiscP],[Discount],[DiscP2],[Discount2],[VIST],
           [SellingType],[SchPc],[Sch],[department],[isclaim],[SPO],[profit], [entryby])
          VALUES
          (@date,'SALE',@doc,'OUT',@prid,@acid,0,@aQty,@bQty,@rate,
           @suggestedPrice,@vest,@discP1,
           (ISNULL(@discP1,0)/100)*ISNULL(@rate,0)*ISNULL(@qty,0),
           @discP2,
           (ISNULL(@discP2,0)/100)*ISNULL(@rate,0)*ISNULL(@qty,0),
           @vist,'DEFAULT',@SchPc,@sch,'A1',@isClaim,@spo,@profit, @username)
        `);
      });

      await Promise.all(psProductInserts);

      // ✅ 2. Update stock (normal + claim)
      const updateStockQuery = `
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
    `;
      await pool
        .request()
        .input("nextDoc", sql.Int, nextDoc)
        .query(updateStockQuery);

      // ✅ 3. Insert into psproductHistory
      await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("username", sql.VarChar(50), username)
        .input("userType", sql.VarChar(50), userType)
        .input("orderDate", sql.VarChar(50), orderDate).query(`
        INSERT INTO psproductHistory (doc,username,UserLevel,date,EntryDate,EntryStatus)
        VALUES (@doc,@username,@userType,@orderDate,CONVERT(varchar(33),GETUTCDATE(),126),'SAVE')
      `);

      console.log(nextDoc);
      const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const dueDate = new Date();

      // ✅ 4. Insert into PSDetail
      await pool
        .request()
        .input("nextDoc", sql.Int, parseInt(nextDoc))
        .input("orderDate", sql.VarChar(50), orderDate)
        .input("customerAcid", sql.Int, parseInt(customerAcid))
        .input("description", sql.VarChar(255), description)
        .input("totalAmount", sql.Decimal(18, 2), totalAmount)
        .input("status", sql.VarChar(50), status)
        .input("dueDate", sql.DateTime, dueDate)
        .input("PBALANCE", sql.Int, 0)
        .input("FREIGHT", sql.Int, 0)
        .input("username", sql.VarChar(50), username).query(`
  INSERT INTO PSDetail
  (Doc, Date, Type, Acid, Description, Amount, GrossProfit, Status, Shopper, dueDate, pbalance, freight)
  VALUES
  (
    @nextDoc,
    @orderDate,
    'SALE',
    @customerAcid,
    @description,
    @totalAmount,
    (SELECT SUM(profit) FROM psproduct WHERE doc = @nextDoc),
    @status,
    'P',
    @DueDate,
    @PBALANCE,
    @FREIGHT
        )
`);
      let entryTime = new Date(orderDate);

      await pool
        .request()
        .input("nextDoc", sql.Int, parseInt(nextDoc))
        .input("orderDate", sql.VarChar(50), orderDate)
        .input("entryDate", sql.DateTime, entryTime)
        .input("customerAcid", sql.Int, parseInt(customerAcid))
        .input("description", sql.VarChar(255), description)
        .input("totalAmount", sql.Decimal(18, 2), totalAmount)
        .input("status", sql.VarChar(50), status)
        .input("dueDate", sql.DateTime, dueDate)
        .input("PBALANCE", sql.Int, 0)
        .input("FREIGHT", sql.Int, 0)
        .input("username", sql.VarChar(50), username).query(`
    INSERT INTO PSDetailHistory
      (Doc, Date, Type, Acid, Description, Amount, GrossProfit, DueDate, PBalance, entryDAte, username)
    VALUES
      (
        @nextDoc,
        @orderDate,
        'SALE',
        @customerAcid,
        @description,
        @totalAmount,
        ISNULL((SELECT SUM(profit) FROM psproduct WHERE doc = @nextDoc), 0),
        @dueDate,
        @PBALANCE,
        @entryDate,
        @username
      )
  `);

      // ✅ 5. Insert into ledgers + ledgersHistory
      const ledgerReq = pool.request();
      ledgerReq
        .input("customerAcid", sql.Int, parseInt(customerAcid))
        .input("salesRevenueAcid", sql.Int, parseInt(4))
        .input("orderDate", sql.VarChar(50), orderDate)
        .input("nextDoc", sql.Int, nextDoc)
        .input("description", sql.VarChar(255), description)
        .input("username", sql.VarChar(50), username)
        .input("userType", sql.VarChar(50), userType)
        .input("totalAmount", sql.Decimal(18, 2), totalAmount);

      await ledgerReq.query(`
      INSERT INTO ledgers (acid,date,type,doc,narration,debit,credit,EntryBy,EntryDateTime)
      VALUES
        (@customerAcid,@orderDate,'sale',@nextDoc,@description,@totalAmount,NULL,@username,SYSUTCDATETIME()),
        (@salesRevenueAcid,@orderDate,'sale',@nextDoc,@description,NULL,@totalAmount,@username,SYSUTCDATETIME());

      INSERT INTO ledgersHistory (acid,date,doc,type,narration,invoice,debit,credit,remainingamount,status,
        UserName,UserLevel,EntryDate,EntryStatus)
      VALUES
        (@customerAcid,@orderDate,@nextDoc,'sale',@description,@nextDoc,@totalAmount,NULL,@totalAmount,0,
          @username,@userType,CONVERT(varchar(33),GETUTCDATE(),126),'SAVE'),
        (@salesRevenueAcid,@orderDate,@nextDoc,'sale',@description,@nextDoc,NULL,@totalAmount,0,0,
          @username,@userType,CONVERT(varchar(33),GETUTCDATE(),126),'SAVE');
    `);

      //const updatedProducts = await getProducts();

      // ✅ Commit
      await transaction.commit();
      const duration = ((performance.now() - startTime) / 1000).toFixed(2);
      res.json({
        success: true,
        message: "Order posted successfully",
        duration,
        invoiceData: [],
        updatedProducts: [],
        doc: nextDoc,
      });
    } catch (error) {
      console.error("❌ postOrder Error:", error);
      if (transaction) {
        try {
          await transaction.rollback();
        } catch { }
      }
      res
        .status(500)
        .json({ error: "Failed to create order", details: error.message });
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
};

module.exports = orderControllers;
