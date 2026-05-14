const express = require('express');
const router = express.Router();
const { getPendingDemandSummary } = require('../controllers/pendingDemandController');
const tokenAuthentication = require('../middleware/tokenAuthentication');

router.get('/', tokenAuthentication, getPendingDemandSummary);

module.exports = router;
