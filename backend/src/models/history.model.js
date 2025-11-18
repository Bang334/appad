const db = require('../config/database');

class HistoryModel {
  // Add to listening history
  static async add(userId, songId) {
    await db.execute(
      'INSERT INTO listening_history (user_id, song_id) VALUES (?, ?)',
      [userId, songId]
    );
    return true;
  }

  // Get user listening history
  static async getUserHistory(userId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT lh.*, s.title, s.file_url, s.cover_url, s.duration,
              a.name as artist_name, al.title as album_title
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ?
       ORDER BY lh.listened_at DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );
    return rows;
  }

  // Clear user history
  static async clearUserHistory(userId) {
    const [result] = await db.execute(
      'DELETE FROM listening_history WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Get recently played (unique songs)
  static async getRecentlyPlayed(userId, limit = 20) {
    const [rows] = await db.execute(
      `SELECT DISTINCT s.*, a.name as artist_name, al.title as album_title,
              MAX(lh.listened_at) as last_played
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ?
       GROUP BY s.song_id
       ORDER BY last_played DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );
    return rows;
  }
}

module.exports = HistoryModel;

