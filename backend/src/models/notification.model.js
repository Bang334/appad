const db = require('../config/database');

class NotificationModel {
  // Create notification
  static async create(notificationData) {
    const { user_id, type, title, message, data } = notificationData;
    const [result] = await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, type, title, message, data ? JSON.stringify(data) : null]
    );
    return result.insertId;
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 50, offset = 0) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    const [rows] = await db.execute(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );
    
    // Parse JSON data (MySQL JSON type may return object or string)
    return rows.map(row => {
      let parsedData = null;
      if (row.data) {
        if (typeof row.data === 'string') {
          try {
            parsedData = JSON.parse(row.data);
          } catch (e) {
            // If already an object or invalid JSON, use as is
            parsedData = row.data;
          }
        } else {
          // Already an object
          parsedData = row.data;
        }
      }
      return {
        ...row,
        data: parsedData
      };
    });
  }

  // Get unread count
  static async getUnreadCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
    return rows[0].count;
  }

  // Mark as read
  static async markAsRead(notificationId, userId) {
    const [result] = await db.execute(
      `UPDATE notifications 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    const [result] = await db.execute(
      `UPDATE notifications 
       SET is_read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );
    return result.affectedRows;
  }

  // Delete notification
  static async delete(notificationId, userId) {
    const [result] = await db.execute(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  }

  // Delete all read notifications
  static async deleteAllRead(userId) {
    const [result] = await db.execute(
      'DELETE FROM notifications WHERE user_id = ? AND is_read = 1',
      [userId]
    );
    return result.affectedRows;
  }

  // Delete all notifications
  static async deleteAll(userId) {
    const [result] = await db.execute(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows;
  }

  // Upsert comment/rating notification: update if exists for this comment_id, or create new
  static async upsertCommentNotification(userId, type, title, message, data) {
    const commentId = data.comment_id;
    
    // Check if a notification for this comment already exists
    // Using LIKE for portability or JSON_EXTRACT if MySQL 5.7+
    const [existing] = await db.execute(
      `SELECT notification_id FROM notifications 
       WHERE user_id = ? AND type = ? AND data LIKE ?`,
      [userId, type, `%"comment_id":${commentId}%`]
    );

    if (existing.length > 0) {
      // Update existing notification
      const notificationId = existing[0].notification_id;
      const dataJson = JSON.stringify(data);
      await db.execute(
        `UPDATE notifications 
         SET title = ?, message = ?, data = ?, is_read = 0, created_at = CURRENT_TIMESTAMP 
         WHERE notification_id = ?`,
        [title, message, dataJson, notificationId]
      );
      return notificationId;
    } else {
      // Create new notification
      return this.create({ user_id: userId, type, title, message, data });
    }
  }

  // Get recent notifications (for badge)
  static async getRecent(userId, limit = 5) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 5, 100));
    
    const [rows] = await db.execute(
      `SELECT * FROM notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ${limitNum}`,
      [userId]
    );
    
    return rows.map(row => {
      let parsedData = null;
      if (row.data) {
        if (typeof row.data === 'string') {
          try {
            parsedData = JSON.parse(row.data);
          } catch (e) {
            parsedData = row.data;
          }
        } else {
          parsedData = row.data;
        }
      }
      return {
        ...row,
        data: parsedData
      };
    });
  }

  // Create broadcast notification (for all users or specific user_ids)
  static async createBroadcast(notificationData) {
    const { user_ids, type, title, message, data } = notificationData;
    
    // If user_ids is null or empty array, send to all users
    let userIds = user_ids;
    if (!user_ids || (Array.isArray(user_ids) && user_ids.length === 0)) {
      const [allUsers] = await db.execute('SELECT user_id FROM users');
      userIds = allUsers.map(u => u.user_id);
    }
    
    // Create notification for each user
    const dataJson = data ? JSON.stringify(data) : null;
    const placeholders = userIds.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const values = [];
    
    userIds.forEach(userId => {
      values.push(userId, type, title, message, dataJson);
    });
    
    const [result] = await db.execute(
      `INSERT INTO notifications (user_id, type, title, message, data) 
       VALUES ${placeholders}`,
      values
    );
    
    return {
      success: true,
      notification_count: userIds.length,
      inserted_id: result.insertId
    };
  }
  // Delete notifications by type and related entity ID in data
  static async deleteByRelatedEntity(type, entityIdKey, entityIdValue) {
    // entityIdKey e.g. "song_id", entityIdValue e.g. 123
    // Basic pattern matching for JSON string
    const pattern = `%"${entityIdKey}":${entityIdValue}%`;
    const patternNoQuote = `%"${entityIdKey}": ${entityIdValue}%`; // Handle space
    
    const [result] = await db.execute(
      'DELETE FROM notifications WHERE type = ? AND (data LIKE ? OR data LIKE ?)',
      [type, pattern, patternNoQuote]
    );
    return result.affectedRows;
  }
  // Delete follow notification
  static async deleteFollowNotification(followerId, artistUserId) {
    const pattern = `%"follower_id":${followerId}%`;
    const patternNoQuote = `%"follower_id": ${followerId}%`;
    
    const [result] = await db.execute(
      'DELETE FROM notifications WHERE user_id = ? AND type = ? AND (data LIKE ? OR data LIKE ?)',
      [artistUserId, 'new_follower', pattern, patternNoQuote]
    );
    return result.affectedRows;
  }

  // Update song notifications
  static async updateSongNotifications(songId, newTitle) {
    const pattern = `%"song_id":${songId}%`;
    const patternNoQuote = `%"song_id": ${songId}%`;
    
    // Get all related notifications
    const [rows] = await db.execute(
      'SELECT notification_id, message, data FROM notifications WHERE type = ? AND (data LIKE ? OR data LIKE ?)',
      ['new_song', pattern, patternNoQuote]
    );
    
    if (rows.length === 0) return 0;
    
    // Update each notification
    let updatedCount = 0;
    for (const row of rows) {
      let data = row.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) { continue; }
      }
      
      // Update title in data
      data.song_title = newTitle;
      
      // Update message if it contains the old title (heuristic)
      // Message format: `${artist?.name || 'Nghệ sĩ'} vừa ra mắt bài hát "${songData.title}"`
      // We reconstruct message using available data
      const artistName = data.artist_name || 'Nghệ sĩ';
      const newMessage = `${artistName} vừa ra mắt bài hát "${newTitle}"`;
      
      await db.execute(
        'UPDATE notifications SET message = ?, data = ? WHERE notification_id = ?',
        [newMessage, JSON.stringify(data), row.notification_id]
      );
      updatedCount++;
    }
    
    return updatedCount;
  }
}

module.exports = NotificationModel;

