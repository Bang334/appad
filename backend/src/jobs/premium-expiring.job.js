const db = require('../config/database');
const NotificationModel = require('../models/notification.model');

/**
 * Premium Expiring Notification Job
 * Chạy tự động mỗi ngày lúc 9h sáng
 * Tạo thông báo cho users có premium sắp hết hạn (trong 3 ngày tới)
 */
class PremiumExpiringJob {
  /**
   * Kiểm tra và tạo thông báo cho users có premium sắp hết hạn
   */
  static async checkAndNotify() {
    try {
      console.log('[Premium Expiring Job] Checking for expiring premium subscriptions...');

      // Lấy tất cả users có premium còn hạn trong 3 ngày tới
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const [users] = await db.execute(
        `SELECT user_id, premium_expiry, 
                DATEDIFF(premium_expiry, CURDATE()) as days_remaining
         FROM users 
         WHERE is_premium = 1 
         AND premium_expiry IS NOT NULL
         AND premium_expiry >= CURDATE()
         AND premium_expiry <= DATE_ADD(CURDATE(), INTERVAL 3 DAY)
         ORDER BY premium_expiry ASC`,
        []
      );

      if (users.length === 0) {
        console.log('[Premium Expiring Job] No expiring premium subscriptions found');
        return { success: true, notified: 0 };
      }

      let notifiedCount = 0;
      let skippedCount = 0;

      for (const user of users) {
        try {
          const daysRemaining = user.days_remaining;
          const expiryDate = new Date(user.premium_expiry);
          const expiryDateStr = expiryDate.toLocaleDateString('vi-VN');

          // Kiểm tra xem đã có notification trong 24h qua chưa
          const [existingNotifications] = await db.execute(
            `SELECT notification_id 
             FROM notifications 
             WHERE user_id = ? 
             AND type = 'premium_expiring' 
             AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
            [user.user_id]
          );

          if (existingNotifications.length > 0) {
            skippedCount++;
            continue; // Đã có notification trong 24h, bỏ qua
          }

          // Tạo notification
          await NotificationModel.create({
            user_id: user.user_id,
            type: 'premium_expiring',
            title: 'Premium sắp hết hạn',
            message: `Gói Premium của bạn sẽ hết hạn sau ${daysRemaining} ngày (${expiryDateStr}). Hãy gia hạn để tiếp tục tận hưởng các tính năng premium!`,
            data: {
              days_remaining: daysRemaining,
              expiry_date: user.premium_expiry,
              expiry_date_formatted: expiryDateStr
            }
          });

          notifiedCount++;
          console.log(`[Premium Expiring Job] Notified user ${user.user_id}: ${daysRemaining} days remaining`);
        } catch (error) {
          console.error(`[Premium Expiring Job] Error notifying user ${user.user_id}:`, error);
        }
      }

      console.log(`[Premium Expiring Job] Completed: ${notifiedCount} notified, ${skippedCount} skipped`);

      return {
        success: true,
        notified: notifiedCount,
        skipped: skippedCount,
        total_checked: users.length
      };
    } catch (error) {
      console.error('[Premium Expiring Job] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PremiumExpiringJob;

