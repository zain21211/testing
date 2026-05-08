const mssql = require("mssql");
const dbConnection = require("../database/connection");
const imageDb = require("../database/imagedb");

const imageViewerController = {
  getImageAndCustomer: async (req, res) => {
    const { type, doc } = req.query;
    const { userType, username } = req.user; // From tokenAuthentication

    if (!type || !doc) {
      return res.status(400).json({ error: "Type and Doc Number are required" });
    }

    try {
      const iPool = await imageDb();
      
      // Ensure orientation column exists
      await iPool.request().query(`
        IF NOT EXISTS (
          SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'name_reciepts' AND COLUMN_NAME = 'orientation'
        )
        BEGIN
          ALTER TABLE name_reciepts ADD orientation INT DEFAULT 0;
        END
      `);

      const imageResult = await iPool
        .request()
        .input("type", mssql.VarChar, type)
        .input("doc", mssql.Int, doc)
        .query(`
          SELECT image, acid, ISNULL(orientation, 0) as orientation, UserName as savedBy, datetime
          FROM name_reciepts
          WHERE type = @type AND doc = @doc
        `);

      if (imageResult.recordset.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }

      const { image, acid, orientation, savedBy, datetime } = imageResult.recordset[0];
      
      // Get customer details from COA table in main database
      const mPool = await dbConnection();
      const customerResult = await mPool
        .request()
        .input("acid", mssql.Int, acid)
        .query(`
          SELECT Subsidary as customerName, route, SPO
          FROM coa
          WHERE id = @acid
        `);

      if (customerResult.recordset.length === 0) {
        return res.status(404).json({ error: "Customer not found for this image" });
      }

      const { customerName, route, SPO } = customerResult.recordset[0];

      // --- Entitlement Check ---
      const uTypeLower = userType?.toLowerCase();
      let isEntitled = false;

      if (uTypeLower === "admin" || uTypeLower === "operator") {
        isEntitled = true;
      } else if (uTypeLower === "sm-kr") {
        if (route && route.toUpperCase().includes("KR")) isEntitled = true;
      } else if (uTypeLower === "sm-sr") {
        if (route && route.toUpperCase().includes("SR")) isEntitled = true;
      } else if (uTypeLower === "spo") {
        if (SPO && SPO.toLowerCase().includes(username.toLowerCase())) isEntitled = true;
      }

      if (!isEntitled) {
        return res.status(403).json({ error: "You are not entitled to view this image based on route or assignment." });
      }

      // Convert buffer to base64
      const imageBase64 = image ? `data:image/png;base64,${image.toString("base64")}` : null;

      res.json({
        image: imageBase64,
        customerName,
        acid,
        orientation,
        metadata: {
          savedBy: savedBy || "Unknown",
          date: datetime ? new Date(datetime).toLocaleDateString() : "N/A",
          time: datetime ? new Date(datetime).toLocaleTimeString() : "N/A"
        }
      });
    } catch (error) {
      console.error("getImageAndCustomer error:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },

  updateImageOrientation: async (req, res) => {
    const { type, doc, orientation } = req.body;

    if (!type || !doc || orientation === undefined) {
      return res.status(400).json({ error: "Type, Doc, and Orientation are required" });
    }

    try {
      const iPool = await imageDb();
      await iPool
        .request()
        .input("type", mssql.VarChar, type)
        .input("doc", mssql.Int, doc)
        .input("orientation", mssql.Int, orientation)
        .query(`
          UPDATE name_reciepts
          SET orientation = @orientation
          WHERE type = @type AND doc = @doc
        `);

      res.json({ success: true, message: "Orientation updated" });
    } catch (error) {
      console.error("updateImageOrientation error:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },

  deleteImage: async (req, res) => {
    const { type, doc } = req.body;
    const { userType } = req.user;

    if (userType?.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Only admins can delete images." });
    }

    if (!type || !doc) {
      return res.status(400).json({ error: "Type and Doc are required for deletion." });
    }

    try {
      const iPool = await imageDb();
      const result = await iPool
        .request()
        .input("type", mssql.VarChar, type)
        .input("doc", mssql.Int, doc)
        .query(`
          DELETE FROM name_reciepts
          WHERE type = @type AND doc = @doc
        `);

      if (result.rowsAffected[0] === 0) {
        return res.status(404).json({ error: "No image found to delete." });
      }

      res.json({ success: true, message: "Image deleted successfully." });
    } catch (error) {
      console.error("deleteImage error:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  },
  
  getLedgerDetails: async (req, res) => {
    const { type, doc, acid } = req.query;
    if (!type || !doc) {
      return res.status(400).json({ error: "Type and Doc are required" });
    }

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("type", mssql.VarChar, type);
      request.input("doc", mssql.Int, parseInt(doc));
      
      let query = `
          SELECT TOP 1 
            ReceiptStatus, 
            Narration, 
            CASE 
              WHEN UPPER(type) = 'SALE' THEN Debit 
              WHEN UPPER(type) IN ('BRV', 'CRV') THEN Credit 
              ELSE (Debit + Credit) 
            END as Amount
          FROM ledgers
          WHERE type = @type AND doc = @doc
      `;

      if (acid) {
        request.input("acid", mssql.Int, parseInt(acid));
        query += " AND acid = @acid";
      }

      const result = await request.query(query);

      if (result.recordset.length === 0) {
        return res.status(404).json({ error: "No ledger entry found" });
      }

      res.json(result.recordset[0]);
    } catch (error) {
      console.error("getLedgerDetails error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  toggleReceiptStatus: async (req, res) => {
    const { type, doc, acid } = req.body;
    const { userType } = req.user;

    if (userType?.toLowerCase() !== "admin") {
      return res.status(403).json({ error: "Only admins can change status." });
    }

    try {
      const pool = await dbConnection();
      const request = pool.request();
      request.input("type", mssql.VarChar, type);
      request.input("doc", mssql.Int, doc);
      
      let baseQuery = "SELECT ReceiptStatus, Narration FROM ledgers WHERE type = @type AND doc = @doc";
      if (acid) {
        request.input("acid", mssql.Int, acid);
        baseQuery += " AND acid = @acid";
      }

      const current = await request.query(baseQuery);

      if (current.recordset.length === 0) {
        return res.status(404).json({ error: "Record not found" });
      }

      const { ReceiptStatus, Narration } = current.recordset[0];
      const isVerified = ReceiptStatus !== null;
      
      let newStatus = isVerified ? null : "RECEIVED";
      let newNarration = Narration || "";

      if (!isVerified) {
        // Switching to VERIFIED (Status: RECEIVED)
        // Remove "PENDING - " from start
        newNarration = newNarration.replace(/^PENDING\s*-\s*/i, "").trim();
      } else {
        // Switching to PENDING (Status: NULL)
        // Prepend "PENDING - "
        if (!newNarration.toUpperCase().startsWith("PENDING -")) {
          newNarration = "PENDING - " + newNarration;
        }
      }

      const updateRequest = pool.request();
      updateRequest.input("type", mssql.VarChar, type);
      updateRequest.input("doc", mssql.Int, doc);
      updateRequest.input("status", mssql.VarChar, newStatus);
      updateRequest.input("narration", mssql.VarChar, newNarration);
      
      let updateQuery = "UPDATE ledgers SET ReceiptStatus = @status, Narration = @narration WHERE type = @type AND doc = @doc";
      if (acid) {
        updateRequest.input("acid", mssql.Int, acid);
        updateQuery += " AND acid = @acid";
      }

      await updateRequest.query(updateQuery);

      res.json({ success: true, newStatus, newNarration });
    } catch (error) {
      console.error("toggleReceiptStatus error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

module.exports = imageViewerController;
