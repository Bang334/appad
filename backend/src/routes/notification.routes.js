const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Get user notifications
router.get('/', NotificationController.getUserNotifications);

// Get unread count
router.get('/unread-count', NotificationController.getUnreadCount);

// Get recent notifications
router.get('/recent', NotificationController.getRecent);

// Mark as read
router.put('/:notification_id/read', NotificationController.markAsRead);

// Mark all as read
router.put('/read-all', NotificationController.markAllAsRead);

// Delete notification
router.delete('/:notification_id', NotificationController.deleteNotification);

// Delete all read notifications
router.delete('/read-all', NotificationController.deleteAllRead);

module.exports = router;

