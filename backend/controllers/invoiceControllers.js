// controllers/invoiceController.js

const convertPhoneNumber = require("../utils/convertPhoneNumber");

// const dbConnection = require('../database/dbConnection');
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection
const getPakistanISODateString = require("../utils/PakTime");
// Keep timers in memory
const lockTimers = new Map();

// Helper to calculate today's total sales
const calculateTodaySales = async (pool) => {
  const result = await pool
    .request()
    .query(`
      SELECT SUM(amount) AS total 
      FROM psdetail 
      WHERE (type = 'sale' OR type = 'SALE') 
        AND status = 'INVOICE' 
        AND CAST(date AS DATE) = CAST(GETDATE() AS DATE)
    `);
  return result.recordset[0].total || 0;
};

// Helper to calculate today's total pending orders (NULL or ESTIMATE)
const calculateTodayPendingOrders = async (pool) => {
  const result = await pool
    .request()
    .query(`
      SELECT SUM(amount) AS total 
      FROM psdetail 
      WHERE (type = 'sale' OR type = 'SALE') 
        AND (status IS NULL OR status <> 'INVOICE')
        AND CAST(date AS DATE) = CAST(GETDATE() AS DATE)
    `);
  return result.recordset[0].total || 0;
};

const invoiceControllers = {
  getLoadList: async (req, res) => {
    const { transporter = "", route = "" } = req.query;

    const query = `
      SELECT 
        CAST(pd.Date AS DATE) AS Date,
        a.route + '-' + CONVERT(VARCHAR(5), a.rno) AS RouteNumber,
        pd.type,
        pd.doc, 
        a.id AS ACID,
        a.UrduName,
        ISNULL(pd.Shopper, '') AS shopper,
        pd.goods,
        a.route,
        a.rno,
        pd.vehicle,
        COUNT(*) OVER() AS TotalCount
      FROM PSDetail pd
      INNER JOIN coa a ON pd.acid = a.Id
      WHERE 
        pd.status = 'invoice' 
        AND pd.s_status IS NULL 
        AND pd.type = 'sale'
        AND a.Subsidary NOT LIKE '%counter%'
        AND pd.amount <> 0
        AND a.route LIKE '%' + @Route + '%'
      ORDER BY a.route, a.rno, pd.doc;
    `;

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("Transporter", sql.VarChar, transporter);
      request.input("Route", sql.VarChar, route);

      const result = await request.query(query);
      res.status(200).json(result.recordset);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      res
        .status(500)
        .json({ message: "Error fetching invoice", error: err.message });
    } finally {
      // sql.close(); // Always close the connection
    }
  },

  postItem: async (req, res) => {
    const { nug = {}, status = "", to = "", id } = req.body;
    console.log(status && !(nug && to));
    const vehicle = to?.toLowerCase();
    if (!req.body && Object.keys(nug).length === 0) {
      return res.status(400).json({ msg: "missing params" });
    }
    let query;

    try {
      const pool = await dbConnection();

      // Run all updates in parallel
      if (nug && to) {
        query = `
    UPDATE psdetail 
    SET vehicle = @To, 
        s_status = @Status, 
        shopper = @Nug 
    WHERE doc = @Doc;
  `;

        await Promise.all(
          Object.entries(nug).map(([doc, shopper]) => {
            const request = pool.request();
            request.input("Status", sql.VarChar, status);
            request.input("Nug", sql.VarChar, shopper);
            request.input("Doc", sql.Int, parseInt(doc));
            request.input(
              "To",
              sql.VarChar,
              vehicle?.includes("ka")
                ? "KR"
                : vehicle?.includes("suz")
                  ? "SR"
                  : to?.toUpperCase()
            );

            return request.query(query);
          })
        );
      }
      if (status && !(nug && to)) {
        query = `
    UPDATE psdetail 
    SET s_status = @Status 
    WHERE doc = @Doc;
    
  `;
        const request = pool.request();

        request.input("Status", sql.VarChar, status);
        request.input("Doc", sql.Int, id);
        await request.query(query);
      }

      res.status(200).json({
        status: "succeeded",
        updated: Object.keys(nug) || "",
        ss: status,
      });
    } catch (err) {
      console.error("Error updating invoice(s):", err);
      res
        .status(500)
        .json({ message: "Error updating invoice(s)", error: err.message });
    } finally {
      // sql.close();
    }
  },

  docReturn: async (req, res) => {
    const { status = "", id } = req.body;

    try {
      const pool = await dbConnection();

      const query = `
    UPDATE psdetail 
    SET status = @Status 
    WHERE doc = @Doc;
    
  `;
      const request = pool.request();

      request.input("Status", sql.VarChar, status);
      request.input("Doc", sql.Int, id);
      request.query(query);

      res.status(200).json({
        status: "succeeded",
        ss: status,
      });
    } catch (err) {
      console.error("Error updating invoice(s):", err);
      res
        .status(500)
        .json({ message: "Error updating invoice(s)", error: err.message });
    } finally {
      // sql.close();
    }
  },

  getDeliveryList: async (req, res) => {
    const { usertype = "", username = "", acid = "", doc = "", route = "" } = req.query;

    const isOperator = usertype.toLowerCase().includes("operator") || username.toLowerCase().includes("operator");
    const isAdmin = usertype.toLowerCase().includes("admin") || username.toLowerCase().includes("zain") || isOperator;
    const transporter = isAdmin ? "" : username;

    let query = `
WITH TodayPSDetail AS (
    SELECT 
        acid,
        MAX(date) AS LastDate,
        doc,
        MAX(amount) AS LastAmount,
        MAX(shopper) AS shopper,
        MAX(vehicle) as vehicle
    FROM psdetail
    WHERE s_status = 'loaded' AND type = 'SALE' AND shopper IS NOT NULL
    GROUP BY acid, doc
)
SELECT 
    c.id AS ACID,
    c.urduname AS UrduName,
    c.route AS route,
    p.doc as doc,
    p.LastDate as date,
    ISNULL(p.LastAmount, 0) AS amount,
    p.shopper AS shopper,
    p.vehicle
FROM coa c
INNER JOIN TodayPSDetail p
    ON p.acid = c.id
WHERE 
    (@acid = '' OR c.id LIKE @acid + '%')
    AND (@doc = '' OR p.doc LIKE '%' + @doc + '%')
    AND (@route = '' OR c.route LIKE '%' + @route + '%')
    `;

    if (!isAdmin) {
      query += `AND p.vehicle = @vehicle `;
    }

    query += `ORDER BY 
    p.LastDate DESC, p.doc DESC;`;

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("vehicle", sql.VarChar, transporter);
      request.input("acid", sql.VarChar, acid);
      request.input("doc", sql.VarChar, doc);
      request.input("route", sql.VarChar, route);

      const result = await request.query(query);
      const data = result.recordset;

      res.status(200).json(data);
    } catch (err) {
      console.error("Error fetching invoice:", err);
      res
        .status(500)
        .json({ message: "Error fetching invoice", error: err.message });
    } finally {
      // sql.close(); // Always close the connection
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
  ac.id as id,
  ac.subsidary as subname,
  d.type as type,
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
         D.Vehicle, D.Description,  ac.id ,
  ac.subsidary ,
  d.type;

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
  P.suggestedRate AS suggestedRate,
  ISNULL(P.Discp, 0) AS Disc1,
  --ISNULL(P.Discp2, 0) AS Disc2,
  ROUND(
    CASE 
      WHEN ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0) = 0 THEN 0
      ELSE (ISNULL(P.Discount2, 0) * 100.0) / (ISNULL(P.QTY, 0) * ISNULL(P.Rate, 0))
    END
  , 2) AS Disc2,
p.vist AS Amount
		,Isnull((select top 1 Schon from SchQTYSlabs where Prid=pr.ID order by Schon),0) SchOn
		,isnull((select top 1 SchPcs from SchQTYSlabs where Prid=pr.ID order by Schon),0) SchPcs
,isnull((select sum(case when type in ('purchase','sale return') then qty+isnull(schpc,0) when type in ('sale','purchase return') then (qty+isnull(schpc,0))*-1 end) from PSProduct where prid=p.prid and isclaim=0  and date>=(select stockdate from Products where ID=p.prid) and date<=dateadd(d,2,GETDATE()) 
),0) StockQTY
FROM PSProduct P 
JOIN Products PR ON PR.ID = P.Prid
WHERE P.Doc = @DocNumber
  AND P.Type = 'Sale'  
  and p.qty<>0
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
      // sql.close(); // Always close the connection
    }
  },

  updateInvoice: async (req, res) => {
    const { invoice, updatedInvoice, nug, tallyBy = '', time, acid } = req.body;

    let username;

    const emptyItems = updatedInvoice?.filter(
      (item) => parseFloat(item.qty) === 0
    );
    const changedItems = updatedInvoice?.filter(
      (item) => parseFloat(item.qty) !== 0
    );

    try {
      const pool = await dbConnection();

      // =============================================
      // BATCH 1: Zero-quantity items (single query)
      // =============================================
      if (emptyItems.length > 0) {
        const emptyPayload = emptyItems
          .filter((item) => item.dateTime)
          .map((item) => {
            const date = new Date(item.dateTime.replace(" ", "T"));
            date.setHours(date.getHours() + 5);
            return {
              psid: item.psid,
              user: item.user,
              dt: date.toISOString(),
            };
          });

        if (emptyPayload.length > 0) {
          await pool
            .request()
            .input("ItemsJson", sql.NVarChar(sql.MAX), JSON.stringify(emptyPayload))
            .query(`
              UPDATE pp SET
                QTY = 0, SchPc = 0, VEST = 0, VIST = 0, PROFIT = 0,
                Discount = 0, Discount2 = 0,
                TallyBy = j.userName,
                PackingDateTime = j.dt
              FROM PsProduct pp
              JOIN OPENJSON(@ItemsJson) WITH (
                psid INT          '$.psid',
                userName NVARCHAR(100) '$.user',
                dt DATETIME       '$.dt'
              ) j ON pp.ID = j.psid
            `);
        }
      }

      // =============================================
      // BATCH 2: Changed-quantity items (single query)
      // =============================================
      if (changedItems.length > 0) {
        const changedPayload = changedItems
          .filter((item) => {
            if (!item.dateTime) {
              console.warn(`Missing dateTime for item with psid: ${item.psid}`);
              return false;
            }
            return true;
          })
          .map((item) => {
            username = item.user; // capture last user for PSDetail update
            const date = new Date(item.dateTime.replace(" ", "T"));
            date.setHours(date.getHours() + 5);
            return {
              psid: item.psid,
              prid: item.prid,
              qty: item.qty,
              user: item.user,
              dt: date.toISOString(),
            };
          });

        if (changedPayload.length > 0) {
          await pool
            .request()
            .input("ItemsJson", sql.NVarChar(sql.MAX), JSON.stringify(changedPayload))
            .query(`
              ;WITH InputItems AS (
                SELECT
                  j.psid,
                  j.prid,
                  j.qty,
                  j.userName,
                  j.dt,
                  -- Calculate scheme pieces per item
                  CASE
                    WHEN pp_sch.sch = 0 THEN 0
                    ELSE ISNULL(slab.SchPc, 0)
                  END AS SchPc
                FROM OPENJSON(@ItemsJson) WITH (
                  psid INT              '$.psid',
                  prid INT              '$.prid',
                  qty  FLOAT            '$.qty',
                  userName NVARCHAR(100) '$.user',
                  dt   DATETIME         '$.dt'
                ) j
                -- Get sch flag from existing PsProduct row
                OUTER APPLY (
                  SELECT TOP 1 ISNULL(sch, 0) AS sch
                  FROM PsProduct WHERE ID = j.psid
                ) pp_sch
                -- Get scheme slab calculation
                OUTER APPLY (
                  SELECT TOP 1
                    ROUND(
                      ISNULL(
                        1.0 * ISNULL(j.qty, 0)
                        / ISNULL(NULLIF(SchOn, 0) + ISNULL(SchPcs, 0), 1),
                        0
                      ) * ISNULL(SchPcs, 0),
                      0
                    ) AS SchPc
                  FROM SchQTYSlabs
                  WHERE prid = j.prid
                    AND schon <= j.qty
                    AND date <= j.dt
                  ORDER BY date DESC, schon DESC
                ) slab
              )

              UPDATE pp SET
                PrintStatus = CASE WHEN pp.PrintStatus IS NULL THEN 'NotPrint' ELSE pp.PrintStatus END,

                profit = CASE
                  WHEN inp.qty = 0 THEN 0
                  ELSE ROUND(
                    (
                      (((pp.Rate * (inp.qty - ISNULL(inp.SchPc, 0))) / NULLIF(inp.qty, 0)) * (1 - (pp.DiscP2 / 100.0))) * (1 - (pp.DiscP / 100.0))
                      -
                      CASE
                        WHEN pp.QTY = 0 THEN 0
                        ELSE ((pp.VIST / (NULLIF(pp.QTY, 0) + ISNULL(inp.SchPc, 0))) - (ISNULL(pp.profit, 0) / (NULLIF(pp.QTY, 0) + ISNULL(inp.SchPc, 0))))
                      END
                    ) * inp.qty
                  , 0)
                END,

                QTY = inp.qty - ISNULL(inp.SchPc, 0),
                SchPc = ISNULL(inp.SchPc, 0),

                VEST = CASE
                  WHEN pr.name LIKE '%publicity%' THEN 0
                  ELSE ROUND((inp.qty - ISNULL(inp.SchPc, 0)) * pp.Rate, 0)
                END,

                VIST = CASE
                  WHEN pr.name LIKE '%publicity%' THEN 0
                  ELSE ROUND((inp.qty - ISNULL(inp.SchPc, 0)) * pp.Rate * (1 - (pp.DiscP + pp.DiscP2) / 100.0), 0)
                END,

                Discount  = (inp.qty - ISNULL(inp.SchPc, 0)) * pp.Rate * (pp.DiscP  / 100.0),
                Discount2 = (inp.qty - ISNULL(inp.SchPc, 0)) * pp.Rate * (pp.DiscP2 / 100.0),
                TallyBy = inp.userName,
                PackingDateTime = inp.dt

              FROM PsProduct pp
              JOIN InputItems inp ON pp.ID = inp.psid
              LEFT JOIN Products pr ON pr.ID = inp.prid
            `);
        }
      }

      // =============================================
      // Update PSDetail — single CTE scan of PsProduct
      // =============================================
      const date = new Date(time.replace(" ", "T"));
      date.setHours(date.getHours() + 5);
      await pool
        .request()
        .input("DOC", sql.Int, invoice)
        .input("NUG", sql.Int, parseInt(nug))
        .input("DateTime", sql.VarChar, time || "null")
        .input("PackedBy", sql.NVarChar, tallyBy || username || "null").query(`
        ;WITH Agg AS (
          SELECT 
            SUM(VIST) AS TotalVIST,
            SUM(Profit) AS TotalProfit,
            SUM(CASE WHEN PackingDateTime IS NULL AND qty <> 0 THEN 1 ELSE 0 END) AS PendingCount,
            MIN(acid) AS FirstAcid
          FROM PsProduct 
          WHERE type = 'sale' AND doc = @DOC
        )
        UPDATE d SET 
          amount = ROUND(ISNULL(a.TotalVIST, 0), 0) - ISNULL(d.Freight, 0),
          GrossProfit = ROUND(ISNULL(a.TotalProfit, 0), 0),
          Status = CASE WHEN a.PendingCount = 0 THEN 'INVOICE' ELSE NULL END,
          Shopper = @NUG,
          description = CASE 
            WHEN a.PendingCount = 0 
            THEN N' Packed by: ' + @PackedBy + ', ' + @DateTime 
            ELSE N' Pending Packed by: ' + @PackedBy + ', ' + @DateTime 
          END,
          PackedBy = @PackedBy
        FROM PSDetail d
        CROSS JOIN Agg a
        WHERE d.type = 'sale' AND d.doc = @DOC
      `);

      // =============================================
      // Update Ledgers — uses PSDetail values (already updated)
      // =============================================
      await pool
        .request()
        .input("DOC", sql.Int, invoice)
        .input("ACID", sql.Int, acid).query(`
        ;WITH InvData AS (
          SELECT amount, description 
          FROM PSDetail 
          WHERE type = 'sale' AND doc = @DOC
        ),
        InvAcid AS (
          SELECT TOP 1 acid 
          FROM PsProduct 
          WHERE type = 'sale' AND doc = @DOC
        )
        UPDATE l SET 
          Debit = CASE WHEN l.acid = ia.acid THEN id.amount ELSE l.Debit END,
          Credit = CASE WHEN l.acid = 4 THEN id.amount ELSE l.Credit END,
          NARRATION = id.description
        FROM Ledgers l
        CROSS JOIN InvData id
        CROSS JOIN InvAcid ia
        WHERE l.type = 'sale' AND l.doc = @DOC 
          AND (l.acid = ia.acid OR l.acid = 4)
      `);

      // Trigger socket update for live sales total
      const newSalesTotal = await calculateTodaySales(pool);
      const io = req.app.get("io");
      if (io) {
        io.emit("salesUpdated", { total: newSalesTotal });
        
        const newPendingTotal = await calculateTodayPendingOrders(pool);
        io.emit("pendingOrdersUpdated", { total: newPendingTotal });
        
        console.log(`📡 Socket emitted salesUpdated: ${newSalesTotal} and pendingOrdersUpdated: ${newPendingTotal}`);
      }

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
          
          // Trigger socket update for live sales total
          const newSalesTotal = await calculateTodaySales(pool2);
          if (io) {
            io.emit("salesUpdated", { total: newSalesTotal });
            
            const newPendingTotal = await calculateTodayPendingOrders(pool2);
            io.emit("pendingOrdersUpdated", { total: newPendingTotal });
          }
          
          console.log(`Auto-unlocked invoice ${doc}`);
        } catch (err) {
          console.error("Auto-unlock failed", err);
        }
      }, 5 * 60 * 1000); // 5 minutes

      lockTimers.set(doc, timer);

      // Emit socket event
      const io = req.app.get("io");
      io.emit("invoiceLocked", { doc });

      // Trigger socket update for sales total (if status became INVOICE via auto-unlock)
      // Actually auto-unlock sets status to INVOICE, so we should check there too.
      // But lockInvoice sets status to 'packing', so no update needed here for sales.

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

      // Trigger socket update for live sales total
      const newSalesTotal = await calculateTodaySales(pool);
      if (io) {
        io.emit("salesUpdated", { total: newSalesTotal });
        
        const newPendingTotal = await calculateTodayPendingOrders(pool);
        io.emit("pendingOrdersUpdated", { total: newPendingTotal });
      }

      res.status(200).json({ msg: "successful" });
    } catch (error) {
      res.status(500).json({ msg: error.message });
    }
  },

  sendWhatsapp: async (req, res) => {
    console.log("this is the req", req.body);
    const { payload } = req.body;
    try {
      const formattedNumber = convertPhoneNumber(payload.number);
      const pool = await dbConnection();

      await pool.request().query`
      INSERT INTO WA (
        Request_date,
        request_time,
        Request_By,
        ACID,
        Customer_Name,
        UrduName,
        whatsapp_chat,
        type,
        doc
      )
      VALUES (
        CAST(GETDATE() AS DATE),
        CAST(GETDATE() AS TIME),
        ${payload.requestBy},
        ${payload.acid},
        ${payload.subname},
        ${payload.urduname},
        ${formattedNumber},
        ${payload.type},
        ${payload.doc}
      )
    `;

      res.status(200).json({ status: "true", msg: "action succeded" });
    } catch (err) {
      console.error("Error inserting record:", err);
      res.status(500).json({ status: "false", msg: `action failed: ${err}` });
    }
  },
  operatorDirectDelivery: async (req, res) => {
    const { doc, username, status = 'delivered' } = req.body;

    if (!doc || !username) {
      return res.status(400).json({ message: "Missing doc or username" });
    }

    try {
      const pool = await dbConnection();
      await pool.request()
        .input("doc", sql.Int, doc)
        .input("username", sql.VarChar, username)
        .input("status", sql.VarChar, status)
        .query(`
          UPDATE psdetail 
          SET s_status = @status, vehicle = @username 
          WHERE doc = @doc AND type = 'sale'
        `);
      res.status(200).json({ message: "Delivery updated successfully" });
    } catch (error) {
      console.error("Error in operatorDirectDelivery:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },

  getTodayTotalSales: async (req, res) => {
    try {
      const pool = await dbConnection();
      const total = await calculateTodaySales(pool);
      res.json({ success: true, total });
    } catch (error) {
      console.error("Error fetching today's sales:", error);
      res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  },
};
module.exports = invoiceControllers;
