const sql = require('mssql');

const dbConfig = {
    user: 'sa',
    password: 'Ai',
    server: '100.122.80.93',
    database: 'images',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: 'SQLEXPRESS'
    },
    port: 1433
};

(async () => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query("SELECT GETDATE() as ServerTime, GETUTCDATE() as ServerUTCTime");
        console.log("SQL Server Local Time (GETDATE):", result.recordset[0].ServerTime);
        console.log("SQL Server UTC Time (GETUTCDATE):", result.recordset[0].ServerUTCTime);
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        process.exit();
    }
})();
