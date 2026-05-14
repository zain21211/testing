const sql = require('mssql');
const dbConnection = require('../database/connection');

const getPendingDemandSummary = async (req, res) => {
    const { route, company, date } = req.query;

    try {
        const pool = await dbConnection();
        const request = pool.request();

        // Optimized query with parameters
        const query = `
            SELECT 
                SUM(ps.qty + ISNULL(ps.schpc, 0)) AS TotalQty,
                p.Category + ' ' + p.urduname + ' ' + p.Company AS ProductName,
                p.code,
                p.Company,
                a.Route
            FROM psproduct ps 
            JOIN coa a ON ps.acid = a.id 
            JOIN Products p ON ps.prid = p.id 
            JOIN PSDetail pd ON ps.type = pd.type AND ps.doc = pd.doc
            WHERE 
                ps.date >= @date 
                AND a.route LIKE @route + '%' 
                AND p.Company LIKE @company + '%' 
                AND ps.packingdatetime IS NULL
                AND ps.type = 'sale' 
            GROUP BY 
                p.Company, p.UrduName, p.category, p.code, a.Route
            HAVING 
                SUM(ps.qty + ISNULL(ps.schpc, 0)) > 0
            ORDER BY 
                p.Company, p.UrduName
        `;

        request.input('route', sql.VarChar(50), route || '');
        request.input('company', sql.VarChar(50), company || '');
        request.input('date', sql.Date, date || new Date());

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching pending demand summary:', err);
        res.status(500).json({ error: 'Failed to fetch summary data', details: err.message });
    }
};

const getPendingDemandFilters = async (req, res) => {
    const { date } = req.query;

    try {
        const pool = await dbConnection();
        const request = pool.request();
        request.input('date', sql.Date, date || new Date());

        const query = `
            SELECT DISTINCT a.Route
            FROM psproduct ps
            JOIN coa a ON ps.acid = a.id
            WHERE ps.date >= @date 
              AND ps.packingdatetime IS NULL 
              AND ps.type = 'sale'
              AND a.Route IS NOT NULL AND a.Route <> '';

            SELECT DISTINCT p.Company
            FROM psproduct ps
            JOIN Products p ON ps.prid = p.id
            WHERE ps.date >= @date 
              AND ps.packingdatetime IS NULL 
              AND ps.type = 'sale'
              AND p.Company IS NOT NULL AND p.Company <> '';
        `;

        const result = await request.query(query);
        res.json({
            routes: result.recordsets[0].map(r => r.Route),
            companies: result.recordsets[1].map(r => r.Company)
        });
    } catch (err) {
        console.error('Error fetching pending demand filters:', err);
        res.status(500).json({ error: 'Failed to fetch filter options' });
    }
};

module.exports = { getPendingDemandSummary, getPendingDemandFilters };
