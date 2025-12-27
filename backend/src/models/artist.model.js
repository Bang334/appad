const db = require('../config/database');

class ArtistModel {
  // Create artist
  static async create(artistData) {
    const { name, bio, image_url, country, user_id, membership_price, membership_duration_days } = artistData;
    const [result] = await db.execute(
      'INSERT INTO artists (name, bio, image_url, country, user_id, membership_price, membership_duration_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        name, 
        bio || null, 
        image_url || null, 
        country || null, 
        user_id || null,
        membership_price || 0,
        membership_duration_days || 30
      ]
    );
    return result.insertId;
  }

  // Find artist by ID
  static async findById(artistId) {
    const [rows] = await db.execute(
      'SELECT * FROM artists WHERE artist_id = ?',
      [artistId]
    );
    return rows[0];
  }

  // Find artist by user_id
  static async findByUserId(userId) {
    const [rows] = await db.execute(
      'SELECT * FROM artists WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Find all artists
  static async findAll(limit = 50, offset = 0) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    const [rows] = await db.execute(
      `SELECT a.*, 
              COUNT(DISTINCT s.song_id) as song_count,
              COUNT(DISTINCT al.album_id) as album_count
       FROM artists a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN songs s ON a.artist_id = s.artist_id
       LEFT JOIN albums al ON a.artist_id = al.artist_id
       WHERE u.is_banned IS NULL 
          OR u.is_banned = 0 
          OR u.is_banned = 1
       GROUP BY a.artist_id
       ORDER BY a.name ASC 
       LIMIT ${limitNum} OFFSET ${offsetNum}`
    );
    // Convert COUNT results to numbers
    return rows.map(row => ({
      ...row,
      song_count: parseInt(row.song_count) || 0,
      album_count: parseInt(row.album_count) || 0
    }));
  }

  // Update artist
  static async update(artistId, artistData) {
    const fields = [];
    const values = [];

    Object.keys(artistData).forEach(key => {
      if (artistData[key] !== undefined && key !== 'artist_id') {
        fields.push(`${key} = ?`);
        values.push(artistData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(artistId);
    const [result] = await db.execute(
      `UPDATE artists SET ${fields.join(', ')} WHERE artist_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete artist
  static async delete(artistId) {
    const [result] = await db.execute(
      'DELETE FROM artists WHERE artist_id = ?',
      [artistId]
    );
    return result.affectedRows > 0;
  }

  // ===== WALLET & REVENUE METHODS =====
  // Note: Artist balance is now stored in user.balance (artist is also a user)

  // Get wallet info (from user balance)
  static async getWalletInfo(artistId) {
    const [rows] = await db.execute(
      `SELECT a.artist_id, a.name, 
              u.balance, 
              a.bank_name, a.bank_account, a.bank_account_name,
              COALESCE(SUM(CASE WHEN t.type = 'revenue' THEN t.amount ELSE 0 END), 0) as total_earned,
              COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_withdrawn
       FROM artists a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN transactions t ON u.user_id = t.user_id
       WHERE a.artist_id = ?
       GROUP BY a.artist_id, a.name, u.balance, a.bank_name, a.bank_account, a.bank_account_name`,
      [artistId]
    );
    return rows[0];
  }

  // Update bank info
  static async updateBankInfo(artistId, bankData) {
    const { bank_name, bank_account, bank_account_name } = bankData;
    const [result] = await db.execute(
      `UPDATE artists 
       SET bank_name = ?, bank_account = ?, bank_account_name = ?
       WHERE artist_id = ?`,
      [bank_name, bank_account, bank_account_name, artistId]
    );
    return result.affectedRows > 0;
  }

  // Get top earning artists
  static async getTopEarners(limit = 10) {
    const [rows] = await db.execute(
      `SELECT artist_id, name, image_url, total_earned, balance
       FROM artists
       ORDER BY total_earned DESC
       LIMIT ?`,
      [parseInt(limit)]
    );
    return rows;
  }

  // Get artist statistics
  static async getStatistics(artistId) {
    const [rows] = await db.execute(
      `SELECT 
        COALESCE(u.balance, 0) as balance,
        COALESCE(SUM(CASE WHEN t.type = 'revenue' THEN t.amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'completed' THEN t.amount ELSE 0 END), 0) as total_withdrawn,
        COUNT(DISTINCT s.song_id) as total_songs,
        COUNT(DISTINCT ps.purchase_id) as total_purchases,
        SUM(s.listen_count) as total_listens
       FROM artists a
       LEFT JOIN users u ON a.user_id = u.user_id
       LEFT JOIN transactions t ON u.user_id = t.user_id
       LEFT JOIN songs s ON a.artist_id = s.artist_id
       LEFT JOIN purchased_songs ps ON s.song_id = ps.song_id
       WHERE a.artist_id = ?
       GROUP BY a.artist_id, u.balance`,
      [artistId]
    );
    return rows[0];
  }

  // Search artists
  static async search(keyword, limit = 20) {
    const [rows] = await db.execute(
      `SELECT * FROM artists 
       WHERE name LIKE ? OR country LIKE ?
       ORDER BY name ASC
       LIMIT ?`,
      [`%${keyword}%`, `%${keyword}%`, parseInt(limit)]
    );
    return rows;
  }

  // ===== ARTIST MEMBERSHIP METHODS =====

  // Update membership price and duration
  static async updateMembershipInfo(artistId, membershipData) {
    const { membership_price, membership_duration_days } = membershipData;
    const [result] = await db.execute(
      `UPDATE artists 
       SET membership_price = ?, membership_duration_days = ?
       WHERE artist_id = ?`,
      [membership_price || 0, membership_duration_days || 30, artistId]
    );
    return result.affectedRows > 0;
  }

  // Get membership info
  static async getMembershipInfo(artistId) {
    const [rows] = await db.execute(
      `SELECT membership_price, membership_duration_days 
       FROM artists 
       WHERE artist_id = ?`,
      [artistId]
    );
    return rows[0] || { membership_price: 0, membership_duration_days: 30 };
  }
}

module.exports = ArtistModel;
