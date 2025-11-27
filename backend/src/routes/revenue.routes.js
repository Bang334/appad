const express = require('express');
const router = express.Router();
const RevenueController = require('../controllers/revenue.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');

// All routes require admin authentication
router.use(authenticateToken);
router.use(isAdmin);

// Calculate monthly revenue (run at end of month)
router.post('/calculate-monthly', RevenueController.calculateMonthlyRevenue);

// Apply calculated revenue (create records)
router.post('/apply-monthly', RevenueController.applyMonthlyRevenue);

// Pay artists (mark as paid and add to balance)
router.post('/pay-artists', RevenueController.payArtists);

// Get platform revenue statistics
router.get('/platform-stats', RevenueController.getPlatformStats);

module.exports = router;

