const express = require("express");
const attendanceControllers = require("../controllers/attendanceControllers");
const router = express.Router();

router.get("/data", attendanceControllers.getAttendanceData);
router.post("/save", attendanceControllers.saveAttendance);

module.exports = router;
