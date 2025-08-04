const express = require('express');
const {TurnoverMethods} = require('../controllers/turnOverReport');

const router = express.Router();

// GET / - Get turnover report
router.get('/', TurnoverMethods.getTurnoverReport);
router.post('/post', TurnoverMethods.postRemarks);
router.get('/remarks', TurnoverMethods.getToday);

module.exports = router;