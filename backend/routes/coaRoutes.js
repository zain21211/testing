// routes/coaRoutes.js
const express = require("express");
const router = express.Router();
const coaController = require("../controllers/coaController");

router.get("/recent-ledgers", coaController.getRecentCOA);
router.put("/update-ledgers", coaController.updateRNO);
router.get("/routes", coaController.getRoutes);

module.exports = router;
