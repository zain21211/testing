const express = require("express");
const invoiceControllers = require("../controllers/invoiceControllers");

const router = express.Router();

// Route to get all invoices
router.get("/loadlist", invoiceControllers.getLoadList);
router.get("/deliverylist", invoiceControllers.getDeliveryList);
router.put("/loadlist", invoiceControllers.getLoadList);
router.put("/loadList/update", invoiceControllers.postItem);
router.put("/deliveryList/update", invoiceControllers.postItem);
router.put("/return", invoiceControllers.docReturn);

// Route to get a single invoice by ID
router.get("/:id", invoiceControllers.getInvoiceByID);
router.put("/:id/update", invoiceControllers.updateInvoice);

// for locking/unlocking
router.put("/:id/lock", invoiceControllers.lockInvoice);
router.put("/:id/unlock", invoiceControllers.unlockInvoice);
router.post("/:id/unlock", invoiceControllers.unlockInvoice);

module.exports = router;
