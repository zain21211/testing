const express = require('express')
const orderControllers = require("../controllers/orderControllers");

const router = express.Router();


router.post('/', orderControllers.postOrder);
router.get('/doc', orderControllers.getNextDoc);
router.get('/cost', orderControllers.getCost);
router.get('/pendingitems', orderControllers.pendingItems)
router.get('/today-total-pending', orderControllers.getTodayTotalPending);
router.get('/schemes/all', orderControllers.getAllSchemes);
// router.put('/update-stock', orderControllers.updateStock);

module.exports = router;