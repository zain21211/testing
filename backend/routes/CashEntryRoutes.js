const express = require("express");
const CashEntryController = require("../controllers/CashEntryControllers");


const router = express.Router();

router.post("/", CashEntryController.insertEntry);
router.get("/today-total", CashEntryController.getTodayTotalRecovery);

module.exports = router;
