const db = require('../config/database');

class FavoriteModel {
  // Add song to favorites
  static async add(userId, songId) {
    try {
      await db.execute(
        'INSERT INTO favorites (user_id, song_id) VALUES (?, ?)',
        [userId, songId]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return false;
      }
      throw error;
    }
  }

  // Remove song from favorites
  static async remove(userId, songId) {
    const [result] = await db.execute(
      'DELETE FROM favorites WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    );
    return result.affectedRows > 0;
  }

  // Get user favorites
  static async getUserFavorites(userId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM favorites f
       JOIN songs s ON f.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE f.user_id = ?
       ORDER BY s.song_id DESC`,
      [userId]
    );
    return rows;
  }

  // Check if song is favorited
  static async isFavorite(userId, songId) {
    const [rows] = await db.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    );
    return rows.length > 0;
  }
}

module.exports = FavoriteModel;

