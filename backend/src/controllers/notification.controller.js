const NotificationModel = require('../models/notification.model');

class NotificationController {
  // Get user notifications
  static async getUserNotifications(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0 } = req.query;

      const notifications = await NotificationModel.getUserNotifications(
        userId,
        limit,
        offset
      );

      const unreadCount = await NotificationModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unread_count: unreadCount,
          total: notifications.length
        }
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get unread count
  static async getUnreadCount(req, res) {
    try {
      const userId = req.user.user_id;
      const count = await NotificationModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          unread_count: count
        }
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Mark as read
  static async markAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      const { notification_id } = req.params;

      const success = await NotificationModel.markAsRead(
        notification_id,
        userId
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Mark all as read
  static async markAllAsRead(req, res) {
    try {
      const userId = req.user.user_id;
      const count = await NotificationModel.markAllAsRead(userId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
        data: {
          marked_count: count
        }
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete notification
  static async deleteNotification(req, res) {
    try {
      const userId = req.user.user_id;
      const { notification_id } = req.params;

      const success = await NotificationModel.delete(notification_id, userId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found'
        });
      }

      res.json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete all read notifications
  static async deleteAllRead(req, res) {
    try {
      const userId = req.user.user_id;
      const count = await NotificationModel.deleteAllRead(userId);

      res.json({
        success: true,
        message: 'All read notifications deleted',
        data: {
          deleted_count: count
        }
      });
    } catch (error) {
      console.error('Delete all read error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get recent notifications (for badge/bell icon)
  static async getRecent(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 5 } = req.query;

      const notifications = await NotificationModel.getRecent(userId, limit);
      const unreadCount = await NotificationModel.getUnreadCount(userId);

      res.json({
        success: true,
        data: {
          notifications,
          unread_count: unreadCount
        }
      });
    } catch (error) {
      console.error('Get recent notifications error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete all notifications
  static async deleteAll(req, res) {
    try {
      const userId = req.user.user_id;
      const count = await NotificationModel.deleteAll(userId);

      res.json({
        success: true,
        message: 'All notifications deleted',
        data: {
          deleted_count: count
        }
      });
    } catch (error) {
      console.error('Delete all error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = NotificationController;

