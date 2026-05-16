const express = require("express");
const attendanceControllers = require("../controllers/attendanceControllers");
const router = express.Router();

router.get("/data", attendanceControllers.getAttendanceData);
router.post("/save", attendanceControllers.saveAttendance);
router.get("/holiday/check", attendanceControllers.checkHoliday);
router.post("/holiday/toggle", attendanceControllers.toggleHoliday);
router.get("/monthly", attendanceControllers.getMonthlyAttendance);

module.exports = router;
