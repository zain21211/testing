const sql = require('mssql');
const dbConnection = require('../database/connection');

const getPendingDemandSummary = async (req, res) => {
    const { route, company, date } = req.query;

    try {
        const pool = await dbConnection();
        const request = pool.request();

        // Optimized query based on user requirement
        const query = `
            SELECT 
                p.Code AS code,
                p.Company,
                p.UrduName,
                p.Category,
                p.Category + ' ' + p.UrduName + ' ' + p.Company AS ProductName,
                SUM(ISNULL(ps.Qty, 0) + ISNULL(ps.SchPc, 0)) AS TotalQty
            FROM PsProduct ps 
            JOIN coa a ON ps.acid = a.id 
            JOIN Products p ON ps.prid = p.ID 
            JOIN PSDetail pd ON ps.type = pd.type AND ps.doc = pd.Doc
            WHERE 
                ps.PackingDateTime IS NULL 
                AND a.Route LIKE @route + '%' 
                AND p.Company LIKE @company + '%' 
                AND CAST(ps.Date AS DATE) >= @date 
                AND pd.Description NOT LIKE 'SV%'
                AND ps.type = 'sale'
                AND a.subsidary NOT LIKE '%counter%'
                AND ps.isclaim = 0
                AND (pd.Status IS NULL OR pd.Status <> 'INVOICE')
            GROUP BY 
                p.Company, p.UrduName, p.Category, p.Code
            HAVING 
                SUM(ISNULL(ps.Qty, 0) + ISNULL(ps.SchPc, 0)) > 0
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
            FROM PsProduct ps
            JOIN coa a ON ps.acid = a.id
            JOIN PSDetail pd ON ps.type = pd.type AND ps.doc = pd.Doc
            WHERE CAST(ps.Date AS DATE) >= @date 
              AND ps.PackingDateTime IS NULL 
              AND pd.Description NOT LIKE 'SV%'
              AND ps.type = 'sale'
              AND a.subsidary NOT LIKE '%counter%'
              AND ps.isclaim = 0
              AND (pd.Status IS NULL OR pd.Status <> 'INVOICE')
              AND a.Route IS NOT NULL AND a.Route <> ''
            GROUP BY a.Route, ps.prid
            HAVING SUM(ISNULL(ps.Qty, 0) + ISNULL(ps.SchPc, 0)) > 0;

            SELECT DISTINCT p.Company
            FROM PsProduct ps
            JOIN Products p ON ps.prid = p.id
            JOIN coa a ON ps.acid = a.id
            JOIN PSDetail pd ON ps.type = pd.type AND ps.doc = pd.Doc
            WHERE CAST(ps.Date AS DATE) >= @date 
              AND ps.PackingDateTime IS NULL 
              AND pd.Description NOT LIKE 'SV%'
              AND ps.type = 'sale'
              AND a.subsidary NOT LIKE '%counter%'
              AND ps.isclaim = 0
              AND (pd.Status IS NULL OR pd.Status <> 'INVOICE')
              AND p.Company IS NOT NULL AND p.Company <> ''
            GROUP BY p.Company, ps.prid
            HAVING SUM(ISNULL(ps.Qty, 0) + ISNULL(ps.SchPc, 0)) > 0;
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
