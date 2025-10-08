// routes/saleRoutes.js
const express = require("express");
const router = express.Router();
const saleController = require("../controllers/salesReportContoller");

router.get("/sales-report", saleController.getSalesReport);
router.put("/sale-report/onhold", saleController.putOnHoldStatus);

module.exports = router;
