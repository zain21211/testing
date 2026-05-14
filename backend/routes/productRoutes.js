const express = require("express");
const productControllers = require("../controllers/productControllers");
const router = express.Router();

router.get("/", productControllers.getProducts);
router.get("/history", productControllers.getProductsHistory);
router.get("/companies", productControllers.getCompanies);

module.exports = router;
