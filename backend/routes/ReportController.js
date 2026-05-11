// reportController.js
const axios = require('axios');

// Replace with your ASP.NET Crystal Report API base URL
const REPORT_API_URL = 'http://localhost:44307/api/report/generate'; // Fix missing colon

/**
 * Sends data to the .NET API to generate a PDF Crystal Report and returns it to the frontend
 */
const generateReport = async (req, res) => {
  const { reportName, parameters } = req.body;

  if (!reportName || !parameters) {
    return res.status(400).json({ error: 'Missing reportName or parameters.' });
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
