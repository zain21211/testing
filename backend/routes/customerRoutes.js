const express = require("express");
const authenticateToken = require("../middleware/tokenAuthentication");
const customerController = require("../controllers/customerControllers");
const byUser = require("../controllers/payVouController"); // Import the byUser controller

const router = express.Router();

// Route to get all customers
router.post("/post", byUser.post); // Use the getCreditCusts method from byUser controller
router.get("/debit", authenticateToken, byUser.getDebitCusts); // Use the getDebitCusts method from byUser controller
router.get("/credit", authenticateToken, byUser.getCreditCusts); // Use the getCreditCusts method from byUser controller
router.get("/newAcid", customerController.getAcid);
router.get("/search", customerController.getCustomers);
router.get("/getImages", customerController.getImages);
router.post("/create", customerController.createCustomer);
router.put("/update", customerController.updateCustomer);
router.post("/createImages", customerController.createImages);
router.put("/updateImages", customerController.updateImages);
router.get("/inactive", customerController.getInactiveProducts);
router.get("/", authenticateToken, customerController.getCustomers);

module.exports = router;
