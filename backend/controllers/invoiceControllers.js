// controllers/invoiceController.js

const convertPhoneNumber = require("../utils/convertPhoneNumber");

// const dbConnection = require('../database/dbConnection');
const sql = require("mssql");
const dbConnection = require("../database/connection"); // Import your database connection
// Keep timers in memory
const lockTimers = new Map();

const invoiceControllers = {
  getLoadList: async (req, res) => {
    const { transporter = "", route = "" } = req.query;

    const query = `
      SELECT 
        d.doc, 
        d.date,
        c.id as ACID, 
        c.urduname as UrduName, 
        d.goods as transporter,
        d.shopper,
        c.route,
        d.vehicle,
        COUNT(*) OVER() as TotalCount
      FROM psdetail d
      join coa c
      on d.acid = c.id
      WHERE d.status = 'invoice'
      --and c.Subsidary not like '%counter%'
      and (d.s_status is null  
      or d.s_status = '' )
      --and goods like '%' + @Transporter + '%'
      and c.route like '%' + @Route + '%'
      and d.date >= DATEADD(year, DATEDIFF(year, 0, GETDATE()), 0)
     -- AND CAST(d.[date] AS DATE) BETWEEN CAST(GETDATE() AS DATE) 
      --AND CAST(DATEADD(DAY, 1, GETDATE()) AS DATE)
      --group by d.goods
      order by d.goods, c.rno;
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
      return res.status(400).json( { msg: "missing params" });
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
        request.query(query);
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
    const { usertype = "", username = "", route = "", acid = "", doc = "" } = req.query;
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const today = new Date();
    const dayName = days[today.getDay()];

    const type = usertype.split("-")[1] || ""; // sr or kr
    const day = route ? route : type ? dayName.toLowerCase() : "";
    const isAdmin = usertype.includes("admin") || username.includes("zain");
    const transporter = type ? "" : username;
    const isSpecialUser = username.toLowerCase().includes("kr") || username.toLowerCase().includes("sr") || type.toLowerCase().includes("kr") || type.toLowerCase().includes("sr");

    let query = `
WITH LedgerTotals AS (
    SELECT 
        acid,
        SUM(debit) AS TotalDebit,
        SUM(credit) AS TotalCredit
    FROM ledgers
  --  WHERE CAST(date AS date) = CAST(GETDATE() AS date)   -- only today's ledger entries
    GROUP BY acid
),
TodayPSDetail AS (
    SELECT 
        acid,
        MAX(date) AS LastDate,
        doc,
        COUNT(DISTINCT doc) AS TotalDocs,
        MAX(amount) AS LastAmount,
        MAX(shopper) AS shopper,
       max(vehicle) as vehicle,
       MAX(s_status) AS s_status
     FROM psdetail
    GROUP BY acid, doc
),
TodayBRV AS (
    SELECT 
        acid,
        SUM(credit) AS TodayBRV
    FROM ledgers
    WHERE type = 'BRV' AND CAST(date AS date) = CAST(GETDATE() AS date)
    GROUP BY acid
)
SELECT 
    c.id AS ACID,
    c.urduname AS UrduName,
   -- c.route AS CustomerRoute,
    t.route AS route,
    -- ISNULL(p.LastDate, NULL) AS LastDate,
    p.doc as doc,
    p.LastDate as date,
   -- ISNULL(p.TotalDocs, 0) AS TotalDocs,
    ISNULL(p.LastAmount, 0) AS amount,
    (p.Shopper) AS shopper,
    ISNULL(b.TodayBRV, 0) AS todayBRV,
    (ISNULL(l.TotalDebit, 0) - ISNULL(l.TotalCredit, 0)) - ISNULL(p.LastAmount, 0) AS prevBalance,
    (ISNULL(l.TotalDebit, 0) - ISNULL(l.TotalCredit, 0)) AS currentBalance
FROM coa c
LEFT JOIN TourDays t
    ON left(c.route, 3) = t.Route
LEFT JOIN TodayPSDetail p
    ON p.acid = c.id
LEFT JOIN TodayBRV b
    ON b.acid = c.id
LEFT JOIN LedgerTotals l
    ON l.acid = c.id
WHERE 
  (1 = ${isSpecialUser ? 0 : 1} OR (t.day like @day+'%' and t.route LIKE @type +'%'))
AND (@acid = '' OR c.id LIKE @acid + '%')
AND (@doc = '' OR p.doc LIKE '%' + @doc + '%')
and (ISNULL(l.TotalDebit, 0) - ISNULL(l.TotalCredit, 0)) > 0
AND p.s_status = 'loaded'
    `;
    if (!isAdmin) {
      query += `AND (@vehicle = '' OR p.vehicle LIKE '%' + @vehicle + '%')`;
    }
    
    query += `ORDER BY 
    c.rno;`;

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("day", sql.VarChar, day);
      request.input("vehicle", sql.VarChar, transporter);
      request.input("type", sql.VarChar, type);
      request.input("acid", sql.VarChar, acid);
      request.input("doc", sql.VarChar, doc);

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

  sendWhatsapp: async (req, res) => {
    console.log("this is the req", req.body);
    const { payload } = req.body;
    try {
      const formattedNumber = convertPhoneNumber(payload.number);
      const date = new Date();

      // extract date and time separately for SQL
      const requestDate = date.toISOString().split("T")[0];
      const requestTime = date.toTimeString().split(" ")[0];

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
        ${requestDate},
        ${requestTime},
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
  }
};
module.exports = invoiceControllers;
