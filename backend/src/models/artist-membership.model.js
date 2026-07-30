const db = require('../config/database');

class ArtistMembershipModel {
  // Create new membership
  static async create(membershipData) {
    const { user_id, artist_id, price_paid, duration_days = 30 } = membershipData;
    
    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(startDate.getDate() + parseInt(duration_days));

    const [result] = await db.execute(
      `INSERT INTO artist_memberships (user_id, artist_id, price_paid, start_date, expiry_date, status)
       VALUES (?, ?, ?, ?, ?, 'active')
       ON CONFLICT (user_id, artist_id) DO UPDATE SET
         price_paid = EXCLUDED.price_paid,
         start_date = EXCLUDED.start_date,
         expiry_date = EXCLUDED.expiry_date,
         status = 'active',
         updated_at = CURRENT_TIMESTAMP`,
      [user_id, artist_id, price_paid, startDate, expiryDate]
    );
    
    return result.insertId || result.affectedRows;
  }

  // Get active membership for user and artist
  static async findByUserAndArtist(userId, artistId) {
    const [rows] = await db.execute(
      `SELECT * FROM artist_memberships 
       WHERE user_id = ? AND artist_id = ? AND status = 'active' AND expiry_date > NOW()
       ORDER BY expiry_date DESC LIMIT 1`,
      [userId, artistId]
    );
    return rows[0] || null;
  }

  // Check if user has active membership for an artist
  static async hasActiveMembership(userId, artistId) {
    const membership = await this.findByUserAndArtist(userId, artistId);
    return membership !== null;
  }

  // Get all active memberships for a user
  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT am.*, a.name as artist_name, a.image_url as artist_image
       FROM artist_memberships am
       LEFT JOIN artists a ON am.artist_id = a.artist_id
       WHERE am.user_id = ? AND am.status = 'active' AND am.expiry_date > NOW()
       ORDER BY am.expiry_date ASC`,
      [userId]
    );
    return rows;
  }

  // Get all memberships for a user (including history)
  static async findByUserAll(userId, limit = 50, offset = 0) {
    limit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    offset = Math.max(0, parseInt(offset) || 0);

    // MySQL2 doesn't support LIMIT/OFFSET as prepared statement parameters
    // So we need to include them directly in the query string
    const [rows] = await db.execute(
      `SELECT am.*, a.name as artist_name, a.image_url as artist_image
       FROM artist_memberships am
       LEFT JOIN artists a ON am.artist_id = a.artist_id
       WHERE am.user_id = ?
       ORDER BY am.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [userId]
    );
    return rows;
  }

  // Get active memberships count for a user
  static async getActiveCountByUser(userId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM artist_memberships 
       WHERE user_id = ? AND status = 'active' AND expiry_date > NOW()`,
      [userId]
    );
    return rows[0]?.count || 0;
  }

  // Get all memberships for an artist (for artist dashboard)
  static async findByArtist(artistId, limit = 50, offset = 0) {
    limit = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    offset = Math.max(0, parseInt(offset) || 0);

    // MySQL2 doesn't support LIMIT/OFFSET as prepared statement parameters
    // So we need to include them directly in the query string
    const [rows] = await db.execute(
      `SELECT am.*, u.username, u.full_name, u.avatar_url
       FROM artist_memberships am
       LEFT JOIN users u ON am.user_id = u.user_id
       WHERE am.artist_id = ?
       ORDER BY am.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [artistId]
    );
    return rows;
  }

  // Get active members count for an artist
  static async getActiveMembersCount(artistId) {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as count FROM artist_memberships 
       WHERE artist_id = ? AND status = 'active' AND expiry_date > NOW()`,
      [artistId]
    );
    return rows[0]?.count || 0;
  }

  // Cancel membership (set status to cancelled)
  static async cancel(userId, artistId) {
    const [result] = await db.execute(
      `UPDATE artist_memberships 
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND artist_id = ? AND status = 'active'`,
      [userId, artistId]
    );
    return result.affectedRows > 0;
  }

  // Update expired memberships (cron job)
  static async updateExpiredMemberships() {
    const [result] = await db.execute(
      `UPDATE artist_memberships 
       SET status = 'expired'
       WHERE status = 'active' AND expiry_date <= NOW()`
    );
    return result.affectedRows;
  }

  // Get membership statistics for an artist
  static async getStats(artistId) {
    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total_memberships,
        COUNT(CASE WHEN status = 'active' AND expiry_date > NOW() THEN 1 END) as active_members,
        COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_members,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_members,
        SUM(price_paid) as total_revenue
       FROM artist_memberships
       WHERE artist_id = ?`,
      [artistId]
    );
    return stats[0] || {};
  }

  // Get membership by ID
  static async findById(membershipId) {
    const [rows] = await db.execute(
      `SELECT am.*, a.name as artist_name, u.username, u.full_name
       FROM artist_memberships am
       LEFT JOIN artists a ON am.artist_id = a.artist_id
       LEFT JOIN users u ON am.user_id = u.user_id
       WHERE am.membership_id = ?`,
      [membershipId]
    );
    return rows[0] || null;
  }
}

module.exports = ArtistMembershipModel;

