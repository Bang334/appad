const db = require('../config/database');

class ReportModel {
  // Create report
  static async create(reportData) {
    const { song_id, reporter_id, report_type, title, description } = reportData;
    const [result] = await db.execute(
      `INSERT INTO reports (song_id, reporter_id, report_type, title, description) 
       VALUES (?, ?, ?, ?, ?)`,
      [song_id, reporter_id, report_type || 'other', title, description]
    );
    return result.insertId;
  }

  // Get report by ID
  static async findById(reportId) {
    const [rows] = await db.execute(
      `SELECT r.*, 
              s.title as song_title, s.artist_id, s.file_url, s.cover_url,
              u.username as reporter_username, u.email as reporter_email,
              a.name as artist_name,
              resolver.username as resolver_username
       FROM reports r
       JOIN songs s ON r.song_id = s.song_id
       JOIN users u ON r.reporter_id = u.user_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
       WHERE r.report_id = ?`,
      [reportId]
    );
    return rows[0];
  }

  // Get all reports (for admin)
  static async findAll(limit = 50, offset = 0, status = null) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    let query = `
      SELECT r.*, 
             s.title as song_title, s.artist_id, s.file_url, s.cover_url,
             u.username as reporter_username, u.email as reporter_email,
             a.name as artist_name, a.user_id as artist_user_id,
             resolver.username as resolver_username
      FROM reports r
      JOIN songs s ON r.song_id = s.song_id
      JOIN users u ON r.reporter_id = u.user_id
      LEFT JOIN artists a ON s.artist_id = a.artist_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
    `;
    
    const params = [];
    if (status) {
      query += ' WHERE r.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get reports for a specific artist
  static async findByArtist(artistId, limit = 50, offset = 0, status = null) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    let query = `
      SELECT r.*, 
             s.title as song_title, s.artist_id, s.file_url, s.cover_url,
             u.username as reporter_username, u.email as reporter_email,
             a.name as artist_name,
             resolver.username as resolver_username
      FROM reports r
      JOIN songs s ON r.song_id = s.song_id
      JOIN users u ON r.reporter_id = u.user_id
      LEFT JOIN artists a ON s.artist_id = a.artist_id
      LEFT JOIN users resolver ON r.resolved_by = resolver.user_id
      WHERE s.artist_id = ?
    `;
    
    const params = [artistId];
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    query += ` ORDER BY r.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;
    
    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Get reports by reporter (user's own reports)
  static async findByReporter(reporterId, limit = 50, offset = 0) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    const [rows] = await db.execute(
      `SELECT r.*, 
              s.title as song_title, s.artist_id, s.file_url, s.cover_url,
              a.name as artist_name
       FROM reports r
       JOIN songs s ON r.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       WHERE r.reporter_id = ?
       ORDER BY r.created_at DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [reporterId]
    );
    return rows;
  }

  // Update report status
  static async updateStatus(reportId, status, resolvedBy = null, adminResponse = null) {
    const updates = ['status = ?'];
    const params = [status];
    
    if (resolvedBy) {
      updates.push('resolved_by = ?');
      params.push(resolvedBy);
    }
    
    if (adminResponse) {
      updates.push('admin_response = ?');
      params.push(adminResponse);
    }
    
    if (status === 'resolved' || status === 'rejected') {
      updates.push('resolved_at = CURRENT_TIMESTAMP');
    }
    
    params.push(reportId);
    
    const [result] = await db.execute(
      `UPDATE reports SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?`,
      params
    );
    return result.affectedRows > 0;
  }

  // Get pending reports count
  static async getPendingCount(artistId = null) {
    let query = 'SELECT COUNT(*) as count FROM reports WHERE status = "pending"';
    const params = [];
    
    if (artistId) {
      query = `
        SELECT COUNT(*) as count 
        FROM reports r
        JOIN songs s ON r.song_id = s.song_id
        WHERE r.status = "pending" AND s.artist_id = ?
      `;
      params.push(artistId);
    }
    
    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  // Check if user already reported this song
  static async hasUserReported(songId, userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM reports WHERE song_id = ? AND reporter_id = ? AND status != "rejected"',
      [songId, userId]
    );
    return rows[0].count > 0;
  }
}

module.exports = ReportModel;

