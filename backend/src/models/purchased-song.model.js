const db = require('../config/database');

class PurchasedSongModel {
  // Purchase a song
  static async purchase(userId, songId, pricePaid) {
    try {
      const [result] = await db.execute(
        'INSERT INTO purchased_songs (user_id, song_id, price_paid) VALUES (?, ?, ?)',
        [userId, songId, pricePaid]
      );
      return result.insertId;
    } catch (error) {
      // If duplicate entry (already purchased), ignore
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  // Check if user has purchased a specific song
  static async hasPurchased(userId, songId) {
    const [rows] = await db.execute(
      'SELECT purchase_id FROM purchased_songs WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    );
    return rows.length > 0;
  }

  // Get all songs purchased by a user
  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT ps.*, s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM purchased_songs ps
       JOIN songs s ON ps.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE ps.user_id = ?
       ORDER BY ps.purchase_date DESC`,
      [userId]
    );
    return rows;
  }

  // Get purchase history for a user
  static async getPurchaseHistory(userId, limit = 50, offset = 0) {
    // Ensure limit and offset are valid positive integers
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Between 1 and 1000
    const offsetNum = Math.max(0, parseInt(offset) || 0); // Must be >= 0
    
    // MySQL2 has issues with LIMIT/OFFSET as placeholders in prepared statements
    // Using template string with validated numbers is safe here
    const [rows] = await db.execute(
      `SELECT ps.*, s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM purchased_songs ps
       JOIN songs s ON ps.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE ps.user_id = ?
       ORDER BY ps.purchase_date DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );
    return rows;
  }

  // Get total spent by user
  static async getTotalSpent(userId) {
    const [rows] = await db.execute(
      'SELECT SUM(price_paid) as total_spent FROM purchased_songs WHERE user_id = ?',
      [userId]
    );
    return rows[0]?.total_spent || 0;
  }

  // Get purchase count for a song (analytics)
  static async getPurchaseCount(songId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as purchase_count FROM purchased_songs WHERE song_id = ?',
      [songId]
    );
    return rows[0]?.purchase_count || 0;
  }

  // Get total revenue from song purchases
  static async getTotalRevenue() {
    const [rows] = await db.execute(
      'SELECT SUM(price_paid) as total_revenue FROM purchased_songs'
    );
    return rows[0]?.total_revenue || 0;
  }
}

module.exports = PurchasedSongModel;

