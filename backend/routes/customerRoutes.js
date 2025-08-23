const express = require("express");
const authenticateToken = require("../middleware/tokenAuthentication");
const customerController = require("../controllers/customerControllers");
const byUser = require("../controllers/payVouController"); // Import the byUser controller

const router = express.Router();

// Route to get all customers
router.get("/", authenticateToken, customerController.getCustomers);
router.get("/inactive", customerController.getInactiveProducts);
router.get("/debit", byUser.getDebitCusts); // Use the getDebitCusts method from byUser controller
router.get("/credit", byUser.getCreditCusts); // Use the getCreditCusts method from byUser controller
router.post("/post", byUser.post); // Use the getCreditCusts method from byUser controller

module.exports = router;
