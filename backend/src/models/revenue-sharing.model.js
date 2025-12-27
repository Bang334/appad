const db = require('../config/database');

class RevenueSharingModel {
  // Create revenue sharing record
  static async create(data) {
    const {
      transaction_id,
      purchase_id,
      album_purchase_id,
      artist_id,
      user_id,
      song_id,
      album_id,
      share_type,
      total_amount,
      artist_share,
      artist_percentage = 70.00,
      platform_share,
      platform_percentage = 30.00,
      calculation_period,
      stream_count = 0,
      listen_duration = 0,
      is_paid_to_artist = 1, // Default: trả ngay cho direct purchase
    } = data;

    // Convert undefined to null for SQL
    const [result] = await db.execute(
      `INSERT INTO revenue_sharing (
        transaction_id, purchase_id, album_purchase_id, artist_id, user_id, song_id, album_id,
        share_type, total_amount, artist_share, artist_percentage,
        platform_share, platform_percentage, calculation_period,
        stream_count, listen_duration, is_paid_to_artist
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction_id || null,
        purchase_id || null,
        album_purchase_id || null,
        artist_id || null,
        user_id || null,
        song_id || null,
        album_id || null,
        share_type || null,
        total_amount || null,
        artist_share || null,
        artist_percentage || null,
        platform_share || null,
        platform_percentage || null,
        calculation_period || null,
        stream_count || null,
        listen_duration || null,
        is_paid_to_artist !== undefined ? is_paid_to_artist : 1
      ]
    );
    return result.insertId;
  }

  // Get revenue by artist
  static async findByArtist(artistId, options = {}) {
    const { limit = 50, offset = 0, period, shareType, isPaid } = options;
    
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    let query = `
      SELECT rs.*, 
             u.username, u.email,
             COALESCE(s.title, al.title) as item_title,
             s.title as song_title,
             al.title as album_title,
             COALESCE(s.cover_url, al.cover_url) as cover_url,
             t.reference_code
      FROM revenue_sharing rs
      LEFT JOIN users u ON rs.user_id = u.user_id
      LEFT JOIN songs s ON rs.song_id = s.song_id
      LEFT JOIN albums al ON rs.album_id = al.album_id
      LEFT JOIN transactions t ON rs.transaction_id = t.transaction_id
      WHERE rs.artist_id = ?
    `;
    
    const params = [artistId];
    
    if (period) {
      query += ' AND rs.calculation_period = ?';
      params.push(period);
    }
    
    if (shareType) {
      query += ' AND rs.share_type = ?';
      params.push(shareType);
    }
    
    if (isPaid !== undefined) {
      query += ' AND rs.is_paid_to_artist = ?';
      params.push(isPaid ? 1 : 0);
    }
    
    query += ` ORDER BY rs.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get unpaid revenue by artist
  static async getUnpaidByArtist(artistId) {
    const [rows] = await db.execute(
      `SELECT SUM(artist_share) as unpaid_amount, COUNT(*) as unpaid_count
       FROM revenue_sharing
       WHERE artist_id = ? AND is_paid_to_artist = 0`,
      [artistId]
    );
    return rows[0];
  }

  // Get revenue statistics by artist
  static async getStatsByArtist(artistId, period = null) {
    let query = `
      SELECT 
        share_type,
        COUNT(*) as count,
        SUM(total_amount) as total_amount,
        SUM(artist_share) as total_artist_share,
        SUM(platform_share) as total_platform_share,
        SUM(stream_count) as total_streams
      FROM revenue_sharing
      WHERE artist_id = ?
    `;
    
    const params = [artistId];
    
    if (period) {
      query += ' AND calculation_period = ?';
      params.push(period);
    }
    
    query += ' GROUP BY share_type';
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Mark as paid to artist
  static async markAsPaid(sharingIds, artistId) {
    if (!Array.isArray(sharingIds) || sharingIds.length === 0) {
      return false;
    }
    
    const placeholders = sharingIds.map(() => '?').join(',');
    const [result] = await db.execute(
      `UPDATE revenue_sharing 
       SET is_paid_to_artist = 1, paid_at = NOW()
       WHERE sharing_id IN (${placeholders}) AND artist_id = ?`,
      [...sharingIds, artistId]
    );
    
    return result.affectedRows;
  }

  // Get revenue by period (for calculation)
  static async getByPeriod(period) {
    const [rows] = await db.execute(
      `SELECT * FROM revenue_sharing 
       WHERE calculation_period = ?
       ORDER BY artist_id, created_at`,
      [period]
    );
    return rows;
  }

  // Get total platform revenue
  static async getTotalPlatformRevenue(options = {}) {
    const { startDate, endDate, shareType } = options;
    
    let query = 'SELECT SUM(platform_share) as total FROM revenue_sharing WHERE 1=1';
    const params = [];
    
    if (startDate) {
      query += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    if (shareType) {
      query += ' AND share_type = ?';
      params.push(shareType);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0]?.total || 0;
  }

  // Get revenue details by ID
  static async findById(sharingId) {
    const [rows] = await db.execute(
      `SELECT rs.*,
              u.username, u.email,
              a.name as artist_name,
              s.title as song_title
       FROM revenue_sharing rs
       LEFT JOIN users u ON rs.user_id = u.user_id
       LEFT JOIN artists a ON rs.artist_id = a.artist_id
       LEFT JOIN songs s ON rs.song_id = s.song_id
       WHERE rs.sharing_id = ?`,
      [sharingId]
    );
    return rows[0];
  }
}

module.exports = RevenueSharingModel;

