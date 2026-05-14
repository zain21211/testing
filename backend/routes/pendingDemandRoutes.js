const express = require('express');
const router = express.Router();
const { getPendingDemandSummary, getPendingDemandFilters } = require('../controllers/pendingDemandController');
const tokenAuthentication = require('../middleware/tokenAuthentication');

router.get('/', tokenAuthentication, getPendingDemandSummary);
router.get('/filter-options', tokenAuthentication, getPendingDemandFilters);

module.exports = router;
