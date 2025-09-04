const express = require("express");
const router = express.Router();
const discountControllers = require("../controllers/discountController");

router.get("/", discountControllers.getDiscount);
router.get("/all", discountControllers.getDiscountAll);

module.exports = router;
