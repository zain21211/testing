const express = require("express");
const imageViewerController = require("../controllers/imageViewerController");
const authMiddleware = require("../middleware/tokenAuthentication");

const router = express.Router();

router.get("/get-image", authMiddleware, imageViewerController.getImageAndCustomer);
router.post("/update-orientation", authMiddleware, imageViewerController.updateImageOrientation);
router.post("/delete-image", authMiddleware, imageViewerController.deleteImage);
router.get("/get-ledger-details", authMiddleware, imageViewerController.getLedgerDetails);
router.post("/toggle-status", authMiddleware, imageViewerController.toggleReceiptStatus);

module.exports = router;
