const express = require('express');
const HistoryController = require('../controllers/history.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

// Routes
router.get('/', authenticateToken, HistoryController.getUserHistory);
router.get('/by-day', authenticateToken, HistoryController.getUserHistoryByDay);
router.get('/recently-played', authenticateToken, HistoryController.getRecentlyPlayed);
router.delete('/clear', authenticateToken, HistoryController.clearHistory);

module.exports = router;

