const express = require('express')
const orderControllers = require("../controllers/orderControllers");

const router = express.Router();


router.post('/', orderControllers.postOrder);
router.get('/doc', orderControllers.getNextDoc);
router.get('/cost', orderControllers.getCost);
router.get('/pendingitems', orderControllers.pendingItems)
// router.put('/update-stock', orderControllers.updateStock);

    module.exports = router;