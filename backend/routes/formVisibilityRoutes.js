const express = require("express");
const router = express.Router();
const {
  getFormVisibility,
  updateFormVisibility,
} = require("../controllers/formVisibilityController");

// GET  /api/form-visibility  — public read (login page needs it)
router.get("/", getFormVisibility);

// PUT  /api/form-visibility  — admin-only write
router.put("/", updateFormVisibility);

module.exports = router;
