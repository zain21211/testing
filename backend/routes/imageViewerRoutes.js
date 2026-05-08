const express = require("express");
const imageViewerController = require("../controllers/imageViewerController");
const authMiddleware = require("../middleware/tokenAuthentication");

const router = express.Router();

router.get("/get-image", authMiddleware, imageViewerController.getImageAndCustomer);
router.post("/update-orientation", authMiddleware, imageViewerController.updateImageOrientation);

module.exports = router;
