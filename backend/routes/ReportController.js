// reportController.js
const axios = require('axios');
const mssql = require('mssql');
const dbConnection = require('../database/connection');

// Replace with your ASP.NET Crystal Report API base URL
const REPORT_API_URL = 'http://localhost:44307/api/report/generate';

/**
 * Sends data to the .NET API to generate a PDF Crystal Report and returns it to the frontend
 */
const generateReport = async (req, res) => {
  const { reportName, parameters } = req.body;

  if (!reportName || !parameters) {
    return res.status(400).json({ error: 'Missing reportName or parameters.' });
  }

  console.log(`📄 Generating report: ${reportName}`);
  console.log(`🎯 Parameters:`, JSON.stringify(parameters, null, 2));

  // Native Invoice Data Route
  if (reportName === 'invoiceReportData') {
    try {
      const doc = parameters.doc || parameters.DocNumber;
      if (!doc) return res.status(400).json({ error: "Missing doc parameter" });

      const pool = await dbConnection();
      
      const query = `
      Select ROW_NUMBER() over (order by p.id) rn,p.id rec,(select sum(debit)-sum(credit) from ledgers l where acid=(select acid from psdetail where type='sale' and doc=@DocNumber) 
      and  l.date<=(select date from PSDetail where type='sale' and doc=@DocNumber) and l.doc<>@DocNumber
      )  PreBal     ,Ac.id,AC.ROUTE,Ac.Subsidary,P.DoC,AC.CreditLimit,Ac.Terms,Ac.CreditDays,Ac.Urduname AS UrduParty,ac.ledgerno, isnull(pr.runs,0) Runs ,Ac.OAddress,Ac.Area,Ac.City,Ac.OCell,Ac.SPO,Pr.company,Pr.Name
      ,Pr.Urduname,Pr.Size,Pr.Packing,Pr.company,Pr.category,Pr.code as ProductCode,Pr.Batch,P.SchPc,P.id AS PSProductID,ISNULL(P.Packet,0) PACKET
      ,P.Qty,P.Rate,P.VEST,P.Discp,P.Discount,P.DiscP2,P.Discount2,P.VIST,P.SchPc,D.Date,D.Discount as TotalDisc,D.ExtraDiscount
      ,D.Freight,round(D.Amount,2) amount,D.PBalance,D.Term,D.Description,D.Vehicle,D.SalesMan,D.Goods,D.Builty,D.CreditDays,D.Received,D.REMARKS
      from PSProduct P JOIN PSDetail D ON P.DOC=D.DOC AND P.TYPE=D.TYPE JOIN COA AC ON D.ACID=AC.ID JOIN Products PR ON PR.ID=P.Prid
      where P.Doc = @DocNumber and P.Type = 'Sale' and D.Type = 'Sale' and Ac.id = D.Acid and Pr.Id = P.Prid 
      order by p.id
      `;

      const request = pool.request();
      request.input('DocNumber', mssql.Int, parseInt(doc));
      
      const result = await request.query(query);
      return res.status(200).json(result.recordset);
    } catch (err) {
      console.error('Error fetching invoice data:', err);
      return res.status(500).json({ error: 'Failed to fetch invoice data.', details: err.message });
    }
  }

  try {
    const response = await axios.post(
      REPORT_API_URL,
      { reportName, parameters },
      { responseType: 'stream' }
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${reportName}.pdf`,
    });

    response.data.pipe(res);
  } catch (error) {
    console.error('Error in generateReport controller:', error.message);
    res.status(500).json({ error: 'Failed to generate report.', details: error.message });
  }
};

module.exports = { generateReport };
