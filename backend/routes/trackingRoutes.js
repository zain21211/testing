const express = require("express");
const router = express.Router();
const trackingController = require("../controllers/trackingController");

// POST  /api/tracking/ping      – field user location ping (every 5 min)
router.post("/ping", trackingController.locationPing);

// GET   /api/tracking/history   – route history for admin map (?username=X&date=YYYY-MM-DD)
router.get("/history", trackingController.getLocationHistory);

// GET   /api/tracking/live      – latest ping per user for today (live view)
router.get("/live", trackingController.getLiveLocations);

// GET   /api/tracking/users     – distinct users tracked on a date (?date=YYYY-MM-DD)
router.get("/users", trackingController.getTrackingUsers);

module.exports = router;
