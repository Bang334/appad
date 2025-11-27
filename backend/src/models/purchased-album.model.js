const db = require('../config/database');

class PurchasedAlbumModel {
  // Purchase an album
  static async purchase(userId, albumId, pricePaid) {
    try {
      const [result] = await db.execute(
        'INSERT INTO purchased_albums (user_id, album_id, price_paid, purchase_date) VALUES (?, ?, ?, NOW())',
        [userId, albumId, pricePaid]
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

  // Check if user has purchased a specific album
  static async hasPurchased(userId, albumId) {
    const [rows] = await db.execute(
      'SELECT purchase_id FROM purchased_albums WHERE user_id = ? AND album_id = ?',
      [userId, albumId]
    );
    return rows.length > 0;
  }

  // Get all albums purchased by a user
  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT pa.*, al.*, a.name as artist_name
       FROM purchased_albums pa
       JOIN albums al ON pa.album_id = al.album_id
       LEFT JOIN artists a ON al.artist_id = a.artist_id
       WHERE pa.user_id = ?
       ORDER BY pa.purchase_date DESC`,
      [userId]
    );
    return rows;
  }

  // Get total revenue from album purchases
  static async getTotalRevenue() {
    const [rows] = await db.execute(
      'SELECT SUM(price_paid) as total_revenue FROM purchased_albums'
    );
    return rows[0]?.total_revenue || 0;
  }
}

module.exports = PurchasedAlbumModel;
