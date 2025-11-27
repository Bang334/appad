const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/report.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');

// Customer routes (authenticated)
router.post('/', authenticateToken, ReportController.createReport);
router.get('/my-reports', authenticateToken, ReportController.getMyReports);

// Artist routes (authenticated, artist role)
router.get('/artist', authenticateToken, ReportController.getArtistReports);

// Admin routes (authenticated, admin role)
router.get('/', authenticateToken, isAdmin, ReportController.getAllReports);
router.get('/pending-count', authenticateToken, ReportController.getPendingCount);

// Common routes
router.get('/:id', authenticateToken, ReportController.getReportById);
router.put('/:id/status', authenticateToken, ReportController.updateReportStatus);

module.exports = router;

