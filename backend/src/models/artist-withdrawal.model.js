const db = require('../config/database');

class ArtistWithdrawalModel {
  // Create withdrawal request
  static async create(data) {
    const {
      artist_id,
      amount,
      fee = 0,
      actual_amount,
      bank_name,
      bank_account,
      bank_account_name,
      artist_note = null,
    } = data;

    const [result] = await db.execute(
      `INSERT INTO artist_withdrawals (
        artist_id, amount, fee, actual_amount,
        bank_name, bank_account, bank_account_name, artist_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [artist_id, amount, fee, actual_amount, bank_name, bank_account, bank_account_name, artist_note]
    );
    
    return result.insertId;
  }

  // Get withdrawal by ID
  static async findById(withdrawalId) {
    const [rows] = await db.execute(
      `SELECT aw.*,
              a.name as artist_name,
              a.balance as artist_balance,
              u.username as processed_by_username
       FROM artist_withdrawals aw
       JOIN artists a ON aw.artist_id = a.artist_id
       LEFT JOIN users u ON aw.processed_by = u.user_id
       WHERE aw.withdrawal_id = ?`,
      [withdrawalId]
    );
    return rows[0];
  }

  // Get withdrawals by artist
  static async findByArtist(artistId, options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    let query = `
      SELECT aw.*, u.username as processed_by_username
      FROM artist_withdrawals aw
      LEFT JOIN users u ON aw.processed_by = u.user_id
      WHERE aw.artist_id = ?
    `;
    
    const params = [artistId];
    
    if (status) {
      query += ' AND aw.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY aw.requested_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get all withdrawals (admin)
  static async findAll(options = {}) {
    const { limit = 50, offset = 0, status } = options;
    
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    let query = `
      SELECT aw.*,
             a.name as artist_name,
             a.balance as artist_balance,
             u.username as processed_by_username
      FROM artist_withdrawals aw
      JOIN artists a ON aw.artist_id = a.artist_id
      LEFT JOIN users u ON aw.processed_by = u.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (status) {
      query += ' AND aw.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY aw.requested_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Update withdrawal status
  static async updateStatus(withdrawalId, status, processedBy, adminNote = null) {
    const [result] = await db.execute(
      `UPDATE artist_withdrawals
       SET status = ?,
           processed_by = ?,
           admin_note = ?,
           processed_at = NOW()
       WHERE withdrawal_id = ?`,
      [status, processedBy, adminNote, withdrawalId]
    );
    
    return result.affectedRows > 0;
  }

  // Get pending withdrawals count
  static async getPendingCount() {
    const [rows] = await db.execute(
      "SELECT COUNT(*) as count FROM artist_withdrawals WHERE status = 'pending'"
    );
    return rows[0]?.count || 0;
  }

  // Get total withdrawn by artist
  static async getTotalWithdrawn(artistId) {
    const [rows] = await db.execute(
      `SELECT SUM(amount) as total
       FROM artist_withdrawals
       WHERE artist_id = ? AND status = 'completed'`,
      [artistId]
    );
    return rows[0]?.total || 0;
  }

  // Get withdrawal statistics
  static async getStatistics() {
    const [rows] = await db.execute(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount,
        SUM(fee) as total_fee,
        SUM(actual_amount) as total_actual_amount
       FROM artist_withdrawals
       GROUP BY status`
    );
    return rows;
  }
}

module.exports = ArtistWithdrawalModel;

