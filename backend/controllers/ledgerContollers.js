const dbConnection = require('../database/connection');
const mssql = require('mssql');

const ledgerControllers = {
  getData: async (req, res) => {
    try {
      const pool = await dbConnection();
      if (!pool || !pool.connected) {
        await dbConnection();
        console.log('Reconnected to the database');
      }

      const {
        acid = "",
        narration = "",
        type = "",
        doc = "",
        startDate = "",
        endDate = "",
        credit = "",
        statusMatch = "",
      } = req.query;

      // Validate required parameters
      if (!acid || !startDate || !endDate) {
        console.warn('Missing required fields: acid, startDate, or endDate');
        return res.status(400).send('Missing required fields: acid, startDate, or endDate');
      }

      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        console.warn('Invalid startDate provided:', startDate);
        return res.status(400).send('Invalid startDate provided');
      }
      const openingDate = new Date(start);
      openingDate.setDate(openingDate.getDate() - 1);

      // Log request parameters

      const sql = `
        SELECT *,
          SUM(ISNULL(x.Debit, 0)) OVER (ORDER BY Date, ID) 
          - SUM(ISNULL(x.Credit, 0)) OVER (ORDER BY Date, ID) AS Total,
          (SELECT COUNT(*) FROM images.dbo.name_reciepts nr WHERE nr.type = x.Type AND nr.doc = x.Doc) as hasImage
        FROM (
          SELECT 
            id,
            Date,
            Type,
            Doc,
            ISNULL(Narration, '') AS Narration,
            ISNULL(Debit, 0) AS Debit,
            ISNULL(Credit, 0) AS Credit,
            ISNULL(Status, 0) AS Status,
            ReceiptStatus
          FROM ledgers l
          WHERE acid = @acid
            AND narration LIKE '%' + @narration + '%'
            AND type LIKE @type + '%'
            AND doc LIKE @doc + '%'
            AND date >= @startDate
            AND date <= @endDate
            AND ISNULL(credit, '') LIKE @credit + '%'
            AND ISNULL(status, 0) LIKE '%' + @statusMatch + '%'
          
          UNION
      
          SELECT 
            0 AS id,
            DATEADD(DAY, -1, @startDate) AS Date,
            'OE' AS Type,
            0 AS Doc,
            'Opening Balance' AS Narration,
            (
              SELECT ISNULL(SUM(Debit), 0) - ISNULL(SUM(Credit), 0)
              FROM Ledgers l2
              WHERE l2.acid = @acid
                AND date < @startDate
            ) AS Debit,
            0 AS Credit,
            0 AS Status,
            NULL AS ReceiptStatus
        ) x
      `;

      const request = pool.request();
      request.input('acid', mssql.NVarChar, acid);
      request.input('narration', mssql.NVarChar, narration);
      request.input('type', mssql.NVarChar, type);
      request.input('doc', mssql.NVarChar, doc); // Fixed: 'doc' instead of 'type' (was a typo in your code)
      request.input('startDate', mssql.DateTime, startDate);
      request.input('endDate', mssql.DateTime, endDate);
      request.input('openingDate', mssql.DateTime, openingDate);
      request.input('credit', mssql.NVarChar, credit);
      request.input('statusMatch', mssql.NVarChar, statusMatch);


      const result = await request.query(sql);

      if (!result.recordset || result.recordset.length === 0) {
        console.log('No ledger data found for the given criteria');
        return res.status(200).json([]);
      }


      res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Error retrieving ledger data:', err.message, err.stack);
      res.status(500).send('Error retrieving data: ' + err.message);
    }
  },
  
  deleteTransaction: async (req, res) => {
    const { type, doc } = req.body;
    const user = req.user;

    if (user.userType.toLowerCase() !== 'admin') {
      return res.status(403).json({ message: "Only administrators can delete transactions." });
    }

    if (!type || !doc) {
      return res.status(400).json({ message: "Missing transaction type or document number." });
    }

    try {
      const pool = await dbConnection();
      const transaction = new mssql.Transaction(pool);
      await transaction.begin();

      try {
        const request = new mssql.Request(transaction);
        request.input('type', mssql.NVarChar, type);
        request.input('doc', mssql.Int, parseInt(doc));

        // 1. Delete from Ledgers
        await request.query("DELETE FROM ledgers WHERE type = @type AND doc = @doc");

        // 2. Delete from PSDetail
        await request.query("DELETE FROM psdetail WHERE type = @type AND doc = @doc");

        // 3. Delete from PSProduct
        await request.query("DELETE FROM psproduct WHERE type = @type AND doc = @doc");

        // 4. Delete from Images database
        await request.query("DELETE FROM images.dbo.name_reciepts WHERE type = @type AND doc = @doc");

        await transaction.commit();
        console.log(`Successfully deleted transaction: ${type} - ${doc}`);
        res.status(200).json({ message: "Transaction deleted successfully from all records." });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      console.error('Error deleting transaction:', err);
      res.status(500).json({ message: "Failed to delete transaction", error: err.message });
    }
  },
};

module.exports = ledgerControllers;