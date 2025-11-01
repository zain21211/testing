const sql = require("mssql");
const dbConnection = require("../database/connection");
const jwt = require("jsonwebtoken");

// productService.js (or inside productControllers.js if you prefer)
const getProducts = async () => {
  let pool;
  try {
    pool = await dbConnection();
    const result = await pool.request().query(`
        SELECT *
        FROM Products
        ORDER BY Name;
      `);
    return result.recordset;
  } catch (err) {
    console.error("Error fetching products:", err);
    throw err;
  } finally {
    // if (pool) await pool.close();
  }
};

const updateStock = async (id, qty, columnName) => {
  try {
    const pool = await dbConnection();

    // Validate column name to prevent SQL injection
    const allowedColumns = ["stockqty", "claimStock"];
    if (!allowedColumns.includes(columnName)) {
      throw new Error(`Invalid column name: ${columnName}`);
    }

    const query = `
        UPDATE Products
        SET ${columnName} =  ISNULL(${columnName}, 0)  - @qty
        WHERE id = @id
      `;

    const result = await pool
      .request()
      .input("qty", sql.Int, qty)
      .input("id", sql.Int, id)
      .query(query);

    return result;
  } catch (err) {
    console.error("❌ Failed to update stock:", err.message);
    throw err;
  }
};

const orderControllers = {
  postOrder: async (req, res) => {
    const { products, totalAmount, col, status } = req.body;

    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET); // This decodes and verifies
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    const { username, userType } = decoded; // User performing the action

    let nextDoc;
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided" });
    }

    // Assume all products have the same acid & date for this order:
    const customerAcid = products[0].acid; // Customer's account ID
    const orderDate = products[0].date; // Date of the order

    try {
      const pool = await dbConnection(); // ✅ Correct usage

      const docResult = await pool
        .request()
        .input("acid", sql.VarChar, customerAcid).query(`
            SELECT ISNULL(
              (SELECT MAX(doc)+1 FROM psproduct WHERE type='sale'),
              0
            )  AS nextDoc
          `);

      nextDoc = docResult.recordset[0].nextDoc || 1;

      const maxDocR = await pool.request().query(`
            SELECT DOC FROM DocNumber WHERE TYPE='SALE'
          `);

      const maxDoc = maxDocR.recordset[0].DOC || 1;

      if (nextDoc === maxDoc) {
        const newDocValue = nextDoc + 1;

        await pool.request().input("newDoc", sql.Int, newDocValue).query(`
        UPDATE docnumber
        SET doc = @newDoc
        WHERE type = 'sale'
      `);
      }

      // Inside postOrder
      const stockq = await Promise.all(
        products.map(async (item) => {
          const col = item.isClaim ? "claimStock" : "stockqty";
          console.log(col);
          try {
            const quantity = item.aQty + item.SchPc;
            const stock = await updateStock(item.prid, quantity, col);
            console.log("THE QTY", stock);
            return stock;
          } catch (err) {
            console.error(
              `Error updating stock for product ID ${item.prid}:`,
              err
            );
            return null; // or throw err if you want to break the Promise.all
          }
        })
      );

      for (const item of products) {
        const {
          date, // Note: item.date is used here, consider using orderDate for consistency if all items must share date
          acid, // Note: item.acid is used here, should be customerAcid for consistency
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
          prid,
          profit,
          spo,
        } = item;

        const discount1 = (discP1 / 100) * rate * qty;
        const discount2 = (discP2 / 100) * rate * qty;

        // PSPRODUCT
        await pool
          .request()
          .input("Date", sql.VarChar, date) // Using item.date
          .input("Type", sql.VarChar, "Sale")
          .input("Doc", sql.Int, nextDoc)
          .input("Type2", sql.VarChar, "OUT")
          .input("Prid", sql.VarChar, prid)
          .input("Acid", sql.VarChar, acid) // Using item.acid, typically this should be customerAcid
          .input("Packet", sql.Int, 0)
          .input("Qty2", sql.Int, qty)
          .input("AQTY", sql.Int, aQty)
          .input("Qty", sql.Int, bQty)
          .input("Rate", sql.Decimal(18, 2), rate)
          .input("SuggestedRate", sql.Decimal(18, 2), suggestedPrice)
          .input("VEST", sql.Decimal(18, 2), vest)
          .input("DiscP", sql.Decimal(18, 2), discP1)
          .input("Discount", sql.Decimal(18, 2), discount1)
          .input("DiscP2", sql.Decimal(18, 2), discP2)
          .input("Discount2", sql.Decimal(18, 2), discount2)
          .input("VIST", sql.Decimal(18, 2), vist)
          .input("SellingType", sql.VarChar, "DEFAULT")
          .input("SchPc", sql.Int, SchPc)
          .input("Sch", sql.Int, sch)
          .input("profit", sql.Int, profit)
          .input("department", sql.VarChar, "A1")
          .input("isclaim", sql.Bit, isClaim ? 1 : 0)
          .input("SPO", sql.VarChar, spo).query(`
              INSERT INTO PsProduct (
                [Date], [Type], [Doc], [Type2], [Prid], [Acid], [Packet], [Qty2],
                [AQTY], [Qty], [Rate], [SuggestedRate], [VEST], [DiscP], [Discount],
                [DiscP2], [Discount2], [VIST], [SellingType], [SchPc], [Sch],
                [department], [isclaim], [SPO],[profit]
              )
              VALUES (
                @Date, @Type, @Doc, @Type2, @Prid, @Acid, @Packet, @Qty2,
                @AQTY, @Qty, @Rate, @SuggestedRate, @VEST, @DiscP, @Discount,
                @DiscP2, @Discount2, @VIST, @SellingType, @SchPc, @Sch,
                @department, @isclaim, @SPO, @profit
              )
            `);

        // PSPRODUCT-HISTORY
        await pool
          .request()
          .input("date", sql.VarChar, orderDate)
          .input("SellingType", sql.VarChar, "DEFAULT")
          .input("SPO", sql.VarChar, username)
          .input("department", sql.VarChar, "A1")
          .input("type", sql.VarChar, "SALE")
          .input("type2", sql.VarChar, "OUT")
          .input("packet", sql.Int, 0)
          .input("sch", sql.Int, sch)
          .input("doc", sql.Int, nextDoc)
          .input("acid", sql.VarChar, acid)
          .input("prid", sql.VarChar, prid)
          .input("qty2", sql.Int, qty)
          .input("qty", sql.Int, bQty)
          .input("schpc", sql.Int, SchPc)
          .input("rate", sql.Decimal(18, 2), rate)
          .input("vest", sql.Decimal(18, 2), vest)
          .input("discp", sql.Decimal(18, 2), discP1)
          .input("discount", sql.Decimal(18, 2), discount1)
          .input("discp2", sql.Decimal(18, 2), discP2)
          .input("discount2", sql.Decimal(18, 2), discount2)
          .input("vist", sql.Decimal(18, 2), vist)
          .input("isclaim", sql.Bit, isClaim ? 1 : 0)
          .input("profit", sql.Int, profit)
          .input("UserName", sql.VarChar, username)
          .input("UserLevel", sql.VarChar, userType || "Default")
          .input("EntryDate", sql.VarChar, new Date().toISOString())
          .input("EntryStatus", sql.VarChar, "SAVE").query(`
    INSERT INTO psproductHistory (
      date, SellingType, SPO, department, type, type2, packet, sch, doc, acid, prid,
      qty2, qty, schpc, rate, vest, discp, discount, discp2, discount2, vist, isclaim,
      profit, UserName, UserLevel, EntryDate, EntryStatus
    )
    VALUES (
      @date, @SellingType, @SPO, @department, @type, @type2, @packet, @sch, @doc, @acid, @prid,
      @qty2, @qty, @schpc, @rate, @vest, @discp, @discount, @discp2, @discount2, @vist, @isclaim,
      @profit, @UserName, @UserLevel, @EntryDate, @EntryStatus
    )
  `);
      }

      // 3. Delete any existing PSDetail entry for this doc & type
      await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("type", sql.VarChar, "SALE") // Added type to make it more specific
        .query(`
            DELETE FROM PSDetail WHERE TYPE = @type AND DOC = @doc
          `);

      // 4. Insert into PSDetail
      // const { date } = products[0]; // Use orderDate defined at the top
      let totalOrderAmount = totalAmount;

      const result = await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .query(
          `SELECT 
          ISNULL(SUM(profit), 0) AS GrossProfit
           FROM PsProduct WHERE type = 'sale' AND doc = @doc`
        );

      const GrossProfit = result.recordset[0].GrossProfit;

      await pool
        .request()
        .input("Doc", sql.Int, nextDoc)
        .input("Date", sql.VarChar, orderDate)
        .input("Type", sql.VarChar, "SALE")
        .input("Acid", sql.VarChar, customerAcid)
        .input("Description", sql.VarChar, "ESTIMATE") // Or generate based on order
        .input("ExtraDiscountP", sql.Decimal(18, 2), 0)
        .input("ExtraDiscount", sql.Decimal(18, 2), 0)
        .input("Freight", sql.Decimal(18, 2), 0)
        .input("Received", sql.Decimal(18, 2), 0)
        .input("Amount", sql.Decimal(18, 2), totalOrderAmount)
        .input("DueDate", sql.VarChar, orderDate) // Or calculate based on credit terms
        .input("PBalance", sql.Decimal(18, 2), 0)
        .input("Term", sql.VarChar, "")
        .input("Vehicle", sql.VarChar, "")
        .input("SalesMan", sql.VarChar, username) // Or a specific salesman ID
        .input("goods", sql.VarChar, "")
        .input("builty", sql.VarChar, "")
        .input("CreditDays", sql.Int, 0)
        .input("PriceList", sql.VarChar, "A")
        .input("BuiltyPath", sql.VarChar, "")
        .input("remarks", sql.VarChar, "") // Could add order remarks here
        .input("GrossProfit", sql.Decimal(18, 2), GrossProfit) // This might need calculation
        .input("Status", sql.VarChar, status.toUpperCase()) // "INVOICE" or "ESTIMATE"
        .input("CTN", sql.VarChar, "P")
        .input("Shopper", sql.VarChar, "P").query(`
            INSERT INTO PSDetail (
              [Doc], [Date], [Type], [Acid], [Description], [ExtraDiscountP],
              [ExtraDiscount], [Freight], [Received], [Amount], [DueDate], [PBalance],
              [Term], [Vehicle], [SalesMan], [goods], [builty], [CreditDays],
              [PriceList], [BuiltyPath], [remarks], [GrossProfit], [Status],
              [CTN], [Shopper]
            )
            VALUES (
              @Doc, @Date, @Type, @Acid, @Description, @ExtraDiscountP,
              @ExtraDiscount, @Freight, @Received, @Amount, @DueDate, @PBalance,
              @Term, @Vehicle, @SalesMan, @goods, @builty, @CreditDays,
              @PriceList, @BuiltyPath, @remarks, @GrossProfit, @Status,
              @CTN, @Shopper
            )
          `);

      // psdetail-history
      await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("date", sql.VarChar, orderDate) // Format to 'YYYY-MM-DD'
        .input("type", sql.VarChar, "SALE")
        .input("acid", sql.VarChar, customerAcid)
        .input("description", sql.VarChar, "")
        .input("extradiscountp", sql.Decimal(18, 2), 0)
        .input("extradiscount", sql.Decimal(18, 2), 0)
        .input("freight", sql.Decimal(18, 2), parseFloat(0))
        .input("received", sql.Decimal(18, 2), 0)
        .input("amount", sql.Decimal(18, 2), totalOrderAmount)
        .input("duedate", sql.VarChar, new Date().toISOString()) // Can format if needed
        .input("pbalance", sql.Decimal(18, 2), 0)
        .input("term", sql.VarChar, "CREDIT")
        .input("vehicle", sql.VarChar, "")
        .input("salesman", sql.VarChar, username)
        .input("goods", sql.VarChar, "")
        .input("builty", sql.VarChar, "")
        .input("BUILTYPATH", sql.VarChar, "")
        .input("creditdays", sql.Int, 7)
        .input("pricelist", sql.VarChar, "")
        .input("grossprofit", sql.Decimal(18, 2), GrossProfit)
        .input("remarks", sql.NVarChar, "")
        .input("UserName", sql.VarChar, username)
        .input("UserLevel", sql.VarChar, userType)
        .input("EntryDate", sql.VarChar, new Date().toISOString())
        .input("EntryStatus", sql.VarChar, "SAVE").query(`
    INSERT INTO psdetailHistory (
      doc, date, type, acid, description, extradiscountp, extradiscount, freight, received,
      amount, duedate, pbalance, term, vehicle, salesman, goods, builty, BUILTYPATH,
      creditdays, pricelist, grossprofit, remarks, UserName, UserLevel, EntryDate, EntryStatus
    )
    VALUES (
      @doc, @date, @type, @acid, @description, @extradiscountp, @extradiscount, @freight, @received,
      @amount, @duedate, @pbalance, @term, @vehicle, @salesman, @goods, @builty, @BUILTYPATH,
      @creditdays, @pricelist, @grossprofit, @remarks, @UserName, @UserLevel, @EntryDate, @EntryStatus
    )
  `);

      // Now fetch the just-inserted record
      const insertedRecord = await pool.request().input("doc", sql.Int, nextDoc)
        .query(`
    SELECT * FROM psdetailHistory
    WHERE doc = @doc
  `);

      const record = insertedRecord.recordset[0];
      console.log("Inserted Record:", insertedRecord.recordset[0]);

      // --- START: ADDED LEDGER QUERIES ---

      // 5. Delete existing ledger entries for this sale document to prevent duplicates
      await pool
        .request()
        .input("type", sql.VarChar, "sale")
        .input("doc", sql.Int, nextDoc).query(`
            DELETE FROM ledgers WHERE type = @type AND doc = @doc
          `);

      // 6. Insert Debit entry into ledgers (Customer Account is Debited)
      // The amount debited should be the final net amount payable by the customer.
      // For simplicity, using totalOrderAmount. Adjust if there are further discounts/charges.

      const debitNarration = `Estimate`;
      await pool
        .request()
        .input("acid", sql.VarChar, customerAcid) // Customer's account ID
        .input("date", sql.VarChar, orderDate) // Date of the sale
        .input("type", sql.VarChar, "sale")
        .input("doc", sql.Int, nextDoc) // Document number
        .input("narration", sql.VarChar(255), debitNarration)
        .input("entryBy1", sql.VarChar, username)
        .input("entryDateTime1", sql.DateTime, new Date())
        .input("debit", sql.Decimal(18, 2), totalOrderAmount) // Total sale amount
        .query(`
            INSERT INTO ledgers (acid, date, type, doc, NARRATION, Debit, EntryBy, EntryDateTime) 
            VALUES (@acid, @date, @type, @doc, @narration, @debit, @entryBy1, @entryDateTime1)
          `);

      // 7. Insert Credit entry into ledgers (Sales Revenue Account is Credited)
      // IMPORTANT: Replace 'YOUR_SALES_REVENUE_ACCOUNT_ID' with your actual Sales Revenue Account ID from your Chart of Accounts.
      const salesRevenueAcid = "4";
      const creditNarration = `PAID CASH`;
      await pool
        .request()
        .input("acid", sql.VarChar, salesRevenueAcid) // Sales revenue account ID
        .input("date", sql.VarChar, orderDate) // Date of the sale
        .input("type", sql.VarChar, "sale")
        .input("doc", sql.Int, nextDoc) // Document number
        .input("narration", sql.VarChar(255), creditNarration)
        .input("entryBy2", sql.VarChar, username)
        .input("entryDateTime2", sql.DateTime, new Date())
        .input("credit", sql.Decimal(18, 2), totalOrderAmount) // Total sale amount
        .query(`
            INSERT INTO ledgers (acid, date, type, doc, NARRATION, credit, EntryBy, EntryDateTime) 
            VALUES (@acid, @date, @type, @doc, @narration, @credit, @entryBy2, @entryDateTime2)
          `);

      // for ledgerhostory debit
      await pool
        .request()
        .input("acid", sql.VarChar, customerAcid)
        .input("date", sql.VarChar, orderDate)
        .input("doc", sql.Int, nextDoc)
        .input("type", sql.VarChar, "sale")
        .input("narration", sql.VarChar(255), debitNarration)
        .input("invoice", sql.Int, nextDoc) // Using same as doc/invoice
        .input("debit", sql.Decimal(18, 2), totalOrderAmount)
        .input("remainingamount", sql.Decimal(18, 2), totalOrderAmount)
        .input("status", sql.Int, 0)
        .input("UserName", sql.VarChar, username)
        .input("UserLevel", sql.VarChar, userType || "Default")
        .input("EntryDate", sql.VarChar, new Date().toISOString())
        .input("EntryStatus", sql.VarChar, "SAVE").query(`
    INSERT INTO ledgersHistory (
      acid, date, doc, type, narration, invoice, debit, remainingamount, status,
      UserName, UserLevel, EntryDate, EntryStatus
    )
    VALUES (
      @acid, @date, @doc, @type, @narration, @invoice, @debit, @remainingamount, @status,
      @UserName, @UserLevel, @EntryDate, @EntryStatus
    )
  `);
      // for ledgerhostory credit

      await pool
        .request()
        .input("acid", sql.VarChar, salesRevenueAcid)
        .input("date", sql.VarChar, orderDate)
        .input("doc", sql.Int, nextDoc)
        .input("type", sql.VarChar, "sale")
        .input("narration", sql.VarChar(255), creditNarration)
        .input("invoice", sql.Int, nextDoc)
        .input("credit", sql.Decimal(18, 2), totalOrderAmount)
        .input("remainingamount", sql.Decimal(18, 2), 0) // Since credit account isn't owed anything
        .input("status", sql.Int, 0)
        .input("UserName", sql.VarChar, username)
        .input("UserLevel", sql.VarChar, userType || "Default")
        .input("EntryDate", sql.VarChar, new Date().toISOString())
        .input("EntryStatus", sql.VarChar, "SAVE").query(`
    INSERT INTO ledgersHistory (
      acid, date, doc, type, narration, invoice, credit, remainingamount, status,
      UserName, UserLevel, EntryDate, EntryStatus
    )
    VALUES (
      @acid, @date, @doc, @type, @narration, @invoice, @credit, @remainingamount, @status,
      @UserName, @UserLevel, @EntryDate, @EntryStatus
    )
  `);

      // --- END: ADDED LEDGER QUERIES ---

      // 8. Return response with invoice data (original step 5)
      const invoiceDataResult = await pool
        .request()
        .input("doc", sql.Int, nextDoc)
        .input("acid", sql.VarChar, customerAcid) // Fetching based on customerAcid for overall order
        .query(`
            SELECT * FROM PsProduct
            WHERE Doc = @doc AND Acid = @acid AND Type = 'Sale' 
          `); // Added Type='Sale' for specificity

      const invoiceData = invoiceDataResult.recordset;

      const updatedProducts = await getProducts();

      res.status(200).json({
        message: "Order created successfully and ledger entries posted!",
        invoiceNumber: nextDoc,
        invoiceData: invoiceData,
        totalAmount: totalAmount,
        stockq,
        updatedProducts,
        record,
      });
    } catch (err) {
      console.error("Error inserting order:", err);
      // Check if it's an SQL error and provide more details if possible
      let errorMessage = "Internal server error";
      if (err.originalError && err.originalError.info) {
        errorMessage = err.originalError.info.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      return res.status(500).json({
        error: "Failed to create order.",
        msg: errorMessage,
        details: err,
      });
    }
  },

  getNextDoc: async (req, res) => {
    const { acid } = req.query;

    try {
      const pool = await dbConnection();

      const docResult = await pool.request().input("acid", sql.VarChar, acid)
        .query(`
        SELECT MAX(doc) AS nextDoc
  FROM psproduct
  WHERE acid = @acid AND type = 'sale' AND printStatus IS NULL

        `);

      const nextDoc = docResult.recordset[0]?.nextDoc || null;
      let date = null;

      if (nextDoc !== 0) {
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

        const rawDate = result.recordset[0]?.Date;
        const date = rawDate ? rawDate.toLocaleDateString() : null;

        const total = resultTotal.recordset[0]?.TotalBillAmount || 0;

        console.log("Fetched date:", date);
        res.json({ nextDoc, date, total });
      }
    } catch (err) {
      console.error("Error in getNextDoc:", err);
      res.status(500).json({ error: "Failed to fetch nextDoc", msg: err });
    }
  },

  getCost: async (req, res) => {
    const { ItemCode } = req.query;

    const SearchDate = new Date();

    if (!ItemCode) {
      return res.status(400).json({ error: "ItemCode are required" });
    }

    try {
      const pool = await dbConnection();

      const result = await pool
        .request()
        .input("ItemCode", sql.VarChar, ItemCode)
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

      const cost = result.recordset[0]?.Cost || 0;
      res.json({ cost, SearchDate });
    } catch (err) {
      console.error("Error fetching cost:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  pendingItems: async (req, res) => {
    const { acid, company = "fit" } = req.query; // Or use req.body if sent in body

    if (!acid) {
      return res.status(400).json({ error: "acid (account ID) is required" });
    }

    try {
      const pool = await dbConnection();

      const result = await pool.request().input("acid", sql.Int, acid)
        .query(`SELECT
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

    (SELECT TOP 1 DiscP FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company) AS DiscP,
    (SELECT TOP 1 DiscP2 FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company) AS DiscP2,

    ROUND(
        p.SaleRate *
        ISNULL((SELECT TOP 1 DiscP2 FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0 *
        (ps.QTY2 - ps.QTY)
    , 2) AS Discount2,

    ROUND(
        (
            p.SaleRate -
            (p.SaleRate * ISNULL((SELECT TOP 1 DiscP2 FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0)
        ) *
        ISNULL((SELECT TOP 1 DiscP FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0 *
        (ps.QTY2 - ps.QTY)
    , 2) AS Discount1,

    -- Corrected for potential division by zero
    ISNULL((
        SELECT FLOOR(1.0 * (ps.QTY2 - ps.QTY) / NULLIF(slab.SchOn, 0)) * slab.SchPcs
        FROM SchQTYSlabs slab
        WHERE slab.PRID = ps.PRID
    ), 0) AS schPc,

    -- Corrected for potential division by zero in the TotalQty calculation
    (ps.QTY2 - ps.QTY) +
    ISNULL((
        SELECT FLOOR(1.0 * (ps.QTY2 - ps.QTY) / NULLIF(slab.SchOn, 0)) * slab.SchPcs
        FROM SchQTYSlabs slab
        WHERE slab.PRID = ps.PRID
    ), 0) AS TotalQty,

    ROUND((
        (
            p.SaleRate
            * (1 - ISNULL((SELECT TOP 1 DiscP FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0)
            * (1 - ISNULL((SELECT TOP 1 DiscP2 FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0)
        )
        * (ps.QTY2 - ps.QTY)
    ), 2) AS Amount,

    ROUND(((
        p.SaleRate
        * (1 - ISNULL((SELECT TOP 1 DiscP FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0)
        * (1 - ISNULL((SELECT TOP 1 DiscP2 FROM PartyDiscount WHERE acid = ps.Acid AND company = p.Company), 0) / 100.0)
    ) - ISNULL((
        SELECT TOP 1
            x.amt / NULLIF(x.qty, 0)
        FROM (
            SELECT
                ISNULL(SUM(pr.vist), 0) * ((100 - AVG(pd.ExtraDiscountP)) / 100.0) AS amt,
                ISNULL(SUM(pr.qty), 0) + ISNULL(SUM(pr.SchPc), 0) AS qty
            FROM PSProduct pr
            JOIN PSDetail pd ON pr.doc = pd.doc AND pr.type = pd.type
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
    ), 0)) *
    (
        -- Also corrected here as part of the Profit calculation's use of TotalQty
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

WHERE
    ps.TYPE = 'SALE'
    AND ps.DATE = (
      SELECT MAX(date)
      FROM PsProduct
      WHERE acid = @acid
      AND qty < qty2
      )
      AND ps.ACID = @acid
      AND ps.QTY < ps.QTY2

`);

      return res.status(200).json(result.recordset);
    } catch (error) {
      console.error("Pending Order Summary Error:", error);
      return res
        .status(500)
        .json({ error: "Server error", details: error.message });
    }
  },
};

module.exports = orderControllers;
