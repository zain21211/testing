// routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/salesReportContoller');

router.get('/sales-report', saleController.getSalesReport);

module.exports = router;
