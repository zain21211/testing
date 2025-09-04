// controllers/invoiceController.js
// const dbConnection = require('../database/dbConnection');
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection
// Keep timers in memory
const lockTimers = new Map();

const invoiceControllers = {
  getInvoice: async (req, res) => {
    const inv = "131368";

    const query = `
    SELECT TOP 20
      ROW_NUMBER() OVER (ORDER BY p.id) rn,
      p.id rec,
      (
        SELECT SUM(debit) - SUM(credit)
        FROM ledgers l 
        WHERE acid = (SELECT acid FROM psdetail WHERE type='sale' AND doc = @DocNumber)
          AND l.date <= (SELECT date FROM PSDetail WHERE type='sale' AND doc = @DocNumber)
          AND l.doc <> @DocNumber
      ) AS PreBal,
      Ac.id, AC.ROUTE, Ac.Subsidary, P.DoC, AC.CreditLimit, Ac.Terms, Ac.CreditDays, 
      Ac.Urduname AS UrduParty, ac.ledgerno, ISNULL(pr.runs, 0) AS Runs, Ac.OAddress, 
      Ac.Area, Ac.City, Ac.OCell, Ac.SPO, Pr.company, Pr.Name, Pr.Urduname, 
      Pr.Size, Pr.Packing, Pr.company, Pr.category, Pr.code AS ProductCode, Pr.Batch, 
      P.SchPc, P.id AS PSProductID, P.Packet, P.Qty, P.Rate, P.VEST, P.Discp, 
      P.Discount, P.DiscP2, P.Discount2, P.VIST, P.SchPc, D.Date, D.Discount AS TotalDisc, 
      D.ExtraDiscount, D.Freight, ROUND(D.Amount, 2) AS amount, D.PBalance, D.Term, 
      D.Description, D.Vehicle, D.SalesMan, D.Goods, D.Builty, D.CreditDays, 
      D.Received, D.REMARKS
    FROM PSProduct P 
    JOIN PSDetail D ON P.DOC = D.DOC AND P.TYPE = D.TYPE 
    JOIN COA AC ON D.ACID = AC.ID 
    JOIN Products PR ON PR.ID = P.Prid
   WHERE P.Type = 'Sale' 
      AND D.Type = 'Sale'
      AND P.Doc = @DocNumber
    ORDER BY p.id;
  `;

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("DocNumber", sql.VarChar, inv);

      const result = await request.query(query);
      console.log("result", result.recordset);
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      res
        .status(500)
        .json({ message: "Error fetching invoice", error: err.message });
    } finally {
      sql.close(); // Always close the connection
    }
  },

  getInvoiceByID: async (req, res) => {
    const inv = req.params.id;
    const user = req.query.user;
    const type = req.query.type;
    const page = req.query.page || ""; // Default to page 1 if not provided
    const isAdmin = type && type.toLowerCase() === "admin";

    const queryCustomer = `
  SELECT 
  P.Doc AS InvoiceNumber,
  SUM(P.discount) AS Extra,
  AC.Urduname AS CustomerName,
  Ac.OCell AS Number,
  AC.CreditLimit,
  AC.Terms,
  AC.CreditDays,
  D.Date AS InvoiceDate,
  D.Freight,
  D.ExtraDiscount,
  D.Amount AS InvoiceAmount,
  D.SalesMan AS Spo,
  D.Vehicle AS Vehical,
  D.shopper as nug,
  D.Description
FROM PSProduct P 
JOIN PSDetail D ON P.DOC = D.DOC AND P.TYPE = D.TYPE 
JOIN COA AC ON D.ACID = AC.ID 
WHERE P.Doc = @DocNumber
  AND P.Type = 'Sale' 
  AND D.Type = 'Sale'
GROUP BY P.Doc, AC.Urduname,Ac.OCell, AC.CreditLimit, AC.Terms, AC.CreditDays, 
         D.Date, D.Freight, D.ExtraDiscount, D.Amount, D.SalesMan,D.Shopper, 
         D.Vehicle, D.Description;

`;
    let queryProducts = `
SELECT 
p.id AS psid,
p.prid AS prid,
  PR.Urduname AS Product,
  PR.Company AS Company,
  PR.Category AS Category,
  pr.size AS Size,
  p.isclaim as claimStatus,
  P.QTY AS BQ,
  P.SchPc AS FOC,
  (ISNULL(P.QTY, 0) + ISNULL(P.SchPc, 0)) AS TQ,
  P.Rate AS Price,
  ISNULL(P.Discp, 0) AS Disc1,
  --ISNULL(P.Discp2, 0) AS Disc2,
  ROUND(
    CASE 
      WHEN ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0) = 0 THEN 0
      ELSE (ISNULL(P.Discount2, 0) * 100.0) / (ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0))
    END
  , 2) AS Disc2,
  ROUND((ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0)) 
        - ISNULL(P.Discp, 0) 
        - ISNULL(P.Discount, 0) 
        - ISNULL(P.DiscP2, 0) 
        - ISNULL(P.Discount2, 0), 0) AS Amount
		,Isnull((select top 1 Schon from SchQTYSlabs where Prid=pr.ID order by Schon),0) SchOn
		,isnull((select top 1 SchPcs from SchQTYSlabs where Prid=pr.ID order by Schon),0) SchPcs
,isnull((select sum(case when type in ('purchase','sale return') then qty+isnull(schpc,0) when type in ('sale','purchase return') then (qty+isnull(schpc,0))*-1 end) from PSProduct where prid=p.prid and isclaim=0  and date>=(select stockdate from Products where ID=p.prid) and date<=dateadd(d,2,GETDATE()) 
),0) StockQTY
FROM PSProduct P 
JOIN Products PR ON PR.ID = P.Prid
WHERE P.Doc = @DocNumber
  AND P.Type = 'Sale' and P.QTY<>0
`;

    if (page.includes("pack")) {
      queryProducts += ` 
     and p.tallyby is null
     `;
    }

    queryProducts += ` ORDER BY pr.batch, pr.company`; // ✅ fix weird space in `pr.company`

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("DocNumber", sql.VarChar, inv);

      const customerRequest = pool.request();
      customerRequest.input("DocNumber", sql.VarChar, inv);
      const customerResult = await customerRequest.query(queryCustomer);

      const productRequest = pool.request();
      productRequest.input("DocNumber", sql.VarChar, inv);
      const productResult = await productRequest.query(queryProducts);

      const response = {
        Customer: customerResult.recordset[0] || {},
        Products: productResult.recordset || [],
      };

      const isZainOrAdmin = user?.toLowerCase() === "zain" || isAdmin === true;

      //   if (!isZainOrAdmin) {
      //   if(response.Customer.SPO === user){
      //     res.status(200).json(response);
      //   } else {
      //     console.log("restricted for", type)
      //     console.log("restricted for", user)
      //     res.status(403).json({massege: "restricted" })
      //   }
      // }else{
      //   res.status(200).json(response);

      // }
      res.status(200).json(response);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      res
        .status(500)
        .json({ message: "Error fetching invoice", error: err.message });
    } finally {
      sql.close(); // Always close the connection
    }
  },
  updateInvoice: async (req, res) => {
    const { invoice, updatedInvoice, nug, tallyBy, time, acid } = req.body;

    let username;

    const emptyItems = updatedInvoice?.filter(
      (item) => parseFloat(item.qty) === 0
    );
    const changedItems = updatedInvoice?.filter(
      (item) => parseFloat(item.qty) !== 0
    );

    try {
      const pool = await dbConnection();

      // --- Process zero quantity items ---
      for (const item of emptyItems) {
        // This part is likely fine, no changes needed here.
        const { psid, dateTime, user } = item;
        if (!dateTime) continue;
        const date = new Date(dateTime.replace(" ", "T"));
        date.setHours(date.getHours() + 5);

        await pool
          .request()
          .input("PsID", sql.Int, psid)
          .input("UserName", sql.NVarChar, user)
          .input("DateTime", sql.DateTime, date).query(`
            UPDATE PsProduct SET QTY = 0, SchPc = 0, VEST = 0, VIST = 0, PROFIT = 0, Discount = 0, Discount2 = 0, TallyBy = @UserName, PackingDateTime = @DateTime WHERE ID = @PsID
          `);
      }

      // --- Process changed quantity items ---
      for (const item of changedItems) {
        const { prid, psid, qty, dateTime, user } = item;
        username = user;
        if (!dateTime) {
          console.warn(`Missing dateTime for item with psid: ${psid}`);
          continue;
        }

        const date = new Date(dateTime.replace(" ", "T"));
        date.setHours(date.getHours() + 5);

        // This is the query that needs the robust fix.
        await pool
          .request()
          .input("PsID", sql.Int, psid)
          .input("QTY", sql.Float, qty)
          .input("UserName", sql.NVarChar, user)
          .input("DateTime", sql.DateTime, date)
          .input("ProductCode", sql.Int, prid).query(`
            BEGIN TRY
              UPDATE PsProduct
              SET
                PrintStatus = CASE WHEN PrintStatus IS NULL THEN 'NotPrint' ELSE PrintStatus END,

                profit = CASE
                    WHEN PsProductInput.QTY = 0 THEN 0
                    ELSE ROUND(
                        (
                            -- Calculate the effective rate after discounts
                            (((Rate * (PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0))) / NULLIF(PsProductInput.QTY, 0)) * (1 - (DiscP2 / 100.0))) * (1 - (DiscP / 100.0))
                            -
                            -- Subtract the cost of goods sold per unit
                            CASE
                                WHEN PsProduct.QTY = 0 THEN 0
                                ELSE ((PsProduct.VIST / (NULLIF(PsProduct.QTY, 0) + ISNULL(PsProductInput.SchPc, 0))) - (ISNULL(PsProduct.profit, 0) / (NULLIF(PsProduct.QTY, 0) + ISNULL(PsProductInput.SchPc, 0)) ))
                            END
                        ) * PsProductInput.QTY
                    , 0)
                END,

                QTY = PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0),
                SchPc = ISNULL(PsProductInput.SchPc, 0),
                VEST = ROUND((PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0)) * Rate, 0), 
                VIST = ROUND((PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0)) * Rate * (1 - (DiscP + DiscP2) / 100.0), 0),
                Discount = (PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0)) * Rate * (DiscP / 100.0),
                Discount2 = (PsProductInput.QTY - ISNULL(PsProductInput.SchPc, 0)) * Rate * (DiscP2 / 100.0),
                TallyBy = PsProductInput.UserName,
                PackingDateTime = PsProductInput.DateTime

              FROM PsProduct
              JOIN (
                SELECT
                  @PsID AS PsID,
                  @QTY AS QTY,
                  @UserName AS UserName,
                  @DateTime AS DateTime,
                  (
                    SELECT TOP 1
                      -- ROBUST FIX APPLIED HERE
                      ROUND(ISNULL(1.0 * ISNULL(@Qty, 0) / ISNULL((NULLIF(SchOn, 0) + ISNULL(SchPcs, 0)), 1), 0) * ISNULL(SchPcs, 0), 0)
                    FROM SchQTYSlabs
                    WHERE prid = @productCode AND schon <= @Qty AND date <= @DateTime
                    ORDER BY date DESC, schon DESC
                  ) AS SchPc
              ) AS PsProductInput ON PsProduct.ID = PsProductInput.PsID
              WHERE PsProduct.ID = @PsID;
            END TRY
            BEGIN CATCH
              DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
              DECLARE @ErrSeverity INT = ERROR_SEVERITY();
              DECLARE @ErrState INT = ERROR_STATE();
              RAISERROR (@ErrMsg, @ErrSeverity, @ErrState);
            END CATCH;
        `);
      }

      // --- Update PSDetail and Ledgers (No changes needed here) ---
      const date = new Date(time.replace(" ", "T"));
      date.setHours(date.getHours() + 5);
      await pool
        .request()
        .input("DOC", sql.Int, invoice)
        .input("NUG", sql.Int, parseInt(nug))
        .input("DateTime", sql.VarChar, time || "null")
        .input("PackedBy", sql.NVarChar, username || "null").query(`
       UPDATE PSDetail SET 
       amount = rOUND(
       (
       SELECT SUM(VIST)
        FROM PsProduct 
        WHERE type = 'sale' 
        AND doc = @DOC
        ),
         0) - ISNULL(Freight, 0),
        GrossProfit =ROUND (
        (
        SELECT SUM(Profit)
         FROM PsProduct 
         WHERE type = 'sale' 
         AND doc = @DOC
        ), 
        0), 
Status = case when (
select count(*)
 from PsProduct 
 where type='sale' 
 and doc=@DOC
  and PackingDateTime is null
) = 0 
 then
  'INVOICE' 
  else 
    null
   end 
, Shopper =  @NUG, 
description = case when (
select count(*) 
from PsProduct
 where type='sale' 
 and doc=@DOC 
 and PackingDateTime is null
 ) = 0
then 
N' Packed by: ' + @PackedBy + ', ' +@DateTime 
else 
  N' Pending Packed by: '  + @PackedBy + ', ' +@DateTime 
end
, PackedBy = @PackedBy WHERE type = 'sale' AND doc = @DOC
`);

      await pool
        .request()
        .input("DOC", sql.Int, invoice)
        .input("ACID", sql.Int, acid).query(`
        UPDATE Ledgers SET Debit = (SELECT amount FROM PSDetail WHERE type = 'sale' AND doc = @DOC), NARRATION = (SELECT description FROM PSDetail WHERE type = 'sale' AND doc = @DOC) WHERE type = 'sale' AND doc = @DOC AND acid = (SELECT TOP 1 acid FROM PsProduct WHERE type = 'sale' AND doc = @DOC);
        UPDATE Ledgers SET Credit = (SELECT amount FROM PSDetail WHERE type = 'sale' AND doc = @DOC), NARRATION = (SELECT description FROM PSDetail WHERE type = 'sale' AND doc = @DOC) WHERE type = 'sale' AND doc = @DOC AND acid = 4;
      `);

      res.status(200).json({
        message: "Invoice update completed",
        emptyItemsCount: emptyItems.length,
        changedItemsCount: changedItems.length,
      });
    } catch (err) {
      console.error("Error updating product:", err);
      // Send back the actual SQL error message for better debugging
      res
        .status(500)
        .json({ error: "Internal server error", sqlError: err.message });
    }
  },

  // Lock invoice
  lockInvoice: async (req, res) => {
    const doc = req.params.id;

    try {
      const pool = await dbConnection();

      await pool
        .request()
        .input("doc", sql.Int, doc)
        .query(
          "update psdetail set status = 'packing' where type = 'sale' and doc = @doc"
        );

      // clear any old timer
      if (lockTimers.has(doc)) clearTimeout(lockTimers.get(doc));

      // start unlock timer (e.g. 5 minutes)
      const timer = setTimeout(async () => {
        try {
          const pool2 = await dbConnection();
          await pool2.request().input("doc", sql.Int, doc).query(`
          update psdetail set
            status = case when(
              select count(*) 
              from PsProduct 
              where type = 'sale' 
              and doc = @doc 
              and PackingDateTime is null
            ) = 0 
            then 'INVOICE' 
            else null 
          end
          where type = 'sale' and doc = @doc
        `);

          // Emit socket event
          const io = req.app.get("io");
          io.emit("invoiceUnlocked", { doc });
          console.log(`Auto-unlocked invoice ${doc}`);
        } catch (err) {
          console.error("Auto-unlock failed", err);
        }
      }, 5 * 60 * 1000); // 5 minutes

      lockTimers.set(doc, timer);

      // Emit socket event
      const io = req.app.get("io");
      io.emit("invoiceLocked", { doc });

      res.status(200).json({ msg: "successful" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },

  // Unlock invoice manually
  unlockInvoice: async (req, res) => {
    const doc = req.params.id;

    try {
      const pool = await dbConnection();

      await pool.request().input("doc", sql.Int, doc).query(`
      update psdetail set
       status = case when(
        select count(*) 
        from PsProduct 
        where type = 'sale' 
        and doc = @doc 
        and PackingDateTime is null
        ) = 0 
      then
       'INVOICE' 
      else 
        null 
      end
      where type = 'sale' 
      and doc = @doc
    `);

      // clear timer if exists
      if (lockTimers.has(doc)) {
        clearTimeout(lockTimers.get(doc));
        lockTimers.delete(doc);
      }

      // Emit socket event
      const io = req.app.get("io");
      io.emit("invoiceUnlocked", { doc });

      res.status(200).json({ msg: "successful" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },
};
module.exports = invoiceControllers;
