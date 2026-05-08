const mssql = require("mssql");
const dbConnection = require("../database/connection");
const imageDb = require("../database/imagedb");

const imageViewerController = {
  getImageAndCustomer: async (req, res) => {
    const { type, doc } = req.query;

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
          SELECT image, acid, ISNULL(orientation, 0) as orientation
          FROM name_reciepts
          WHERE type = @type AND doc = @doc
        `);

      if (imageResult.recordset.length === 0) {
        return res.status(404).json({ error: "Image not found" });
      }

      const { image, acid, orientation } = imageResult.recordset[0];
      
      // Convert buffer to base64
      const imageBase64 = image ? `data:image/png;base64,${image.toString("base64")}` : null;

      // Get customer name from COA table in main database
      const mPool = await dbConnection();
      const customerResult = await mPool
        .request()
        .input("acid", mssql.Int, acid)
        .query(`
          SELECT Subsidary as customerName
          FROM coa
          WHERE id = @acid
        `);

      const customerName = customerResult.recordset.length > 0 ? customerResult.recordset[0].customerName : "Unknown Customer";

      res.json({
        image: imageBase64,
        customerName,
        acid,
        orientation
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
  }
};

module.exports = imageViewerController;
