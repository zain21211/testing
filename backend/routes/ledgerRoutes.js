const express = require('express');
const ledgerControllers = require('../controllers/ledgerContollers');
const tokenAuthentication = require('../middleware/tokenAuthentication');

const router = express.Router();
console.log("✅ Ledger Router Initialized. downloadPdf exists:", typeof ledgerControllers.downloadPdf);

router.get('/', ledgerControllers.getData);
router.post('/download-pdf', ledgerControllers.downloadPdf);
router.post('/delete-transaction', tokenAuthentication, ledgerControllers.deleteTransaction);

module.exports = router;