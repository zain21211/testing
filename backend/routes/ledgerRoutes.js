const express = require('express');
const ledgerControllers = require('../controllers/ledgerContollers');
const tokenAuthentication = require('../middleware/tokenAuthentication');

const router = express.Router();

router.get('/', ledgerControllers.getData);
router.post('/delete-transaction', tokenAuthentication, ledgerControllers.deleteTransaction);

module.exports = router;