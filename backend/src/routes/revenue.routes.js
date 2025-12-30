const express = require('express');
const router = express.Router();
const RevenueController = require('../controllers/revenue.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Admin only routes - protect individually with isAdmin
router.post('/calculate-monthly', isAdmin, RevenueController.calculateMonthlyRevenue);
router.post('/apply-monthly', isAdmin, RevenueController.applyMonthlyRevenue);
router.post('/pay-artists', isAdmin, RevenueController.payArtists);
router.get('/platform-stats', isAdmin, RevenueController.getPlatformStats);
router.get('/payout-history', isAdmin, RevenueController.getPayoutHistory);
router.get('/payout-batch', isAdmin, RevenueController.getPayoutBatchDetails);

// Artist/Admin routes
router.get('/artist-payout-history/:artist_id', RevenueController.getArtistPayoutHistory);

module.exports = router;

