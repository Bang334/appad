const db = require('../config/database');

class PremiumListeningStatsModel {
  // Record or update premium listening
  static async recordListen(data) {
    const { user_id, song_id, artist_id, duration_listened = 0, is_completed = false } = data;
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    try {
      // Try to update existing record for today
      const [result] = await db.execute(
        `INSERT INTO premium_listening_stats 
         (user_id, song_id, artist_id, listen_date, listen_count, total_duration, completed_count)
         VALUES (?, ?, ?, ?, 1, ?, ?)
         ON CONFLICT (user_id, song_id, listen_date) DO UPDATE SET
           listen_count = premium_listening_stats.listen_count + 1,
           total_duration = premium_listening_stats.total_duration + EXCLUDED.total_duration,
           completed_count = premium_listening_stats.completed_count + EXCLUDED.completed_count`,
        [user_id, song_id, artist_id, today, duration_listened, is_completed ? 1 : 0]
      );
      
      return result.insertId || result.affectedRows;
    } catch (error) {
      console.error('Error recording premium listen:', error);
      throw error;
    }
  }

  // Get stats by period
  static async getStatsByPeriod(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        artist_id,
        song_id,
        SUM(listen_count) as total_listens,
        SUM(total_duration) as total_duration,
        SUM(completed_count) as total_completed,
        COUNT(DISTINCT user_id) as unique_listeners
       FROM premium_listening_stats
       WHERE listen_date BETWEEN ? AND ?
       GROUP BY artist_id, song_id`,
      [startDate, endDate]
    );
    return rows;
  }

  // Get stats by artist and period
  static async getStatsByArtist(artistId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        song_id,
        SUM(listen_count) as total_listens,
        SUM(total_duration) as total_duration,
        SUM(completed_count) as total_completed,
        COUNT(DISTINCT user_id) as unique_listeners
       FROM premium_listening_stats
       WHERE artist_id = ? AND listen_date BETWEEN ? AND ?
       GROUP BY song_id
       ORDER BY total_listens DESC`,
      [artistId, startDate, endDate]
    );
    return rows;
  }

  // Get total streams for all artists in period
  static async getTotalStreamsByPeriod(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        artist_id,
        SUM(listen_count) as total_streams
       FROM premium_listening_stats
       WHERE listen_date BETWEEN ? AND ?
       GROUP BY artist_id`,
      [startDate, endDate]
    );
    return rows;
  }

  // Get monthly stats summary
  static async getMonthlySummary(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    return this.getTotalStreamsByPeriod(startDate, endDate);
  }

  // Get user listening history
  static async getUserHistory(userId, limit = 50, offset = 0) {
    const [rows] = await db.execute(
      `SELECT pls.*,
              s.title as song_title,
              a.name as artist_name
       FROM premium_listening_stats pls
       JOIN songs s ON pls.song_id = s.song_id
       JOIN artists a ON pls.artist_id = a.artist_id
       WHERE pls.user_id = ?
       ORDER BY pls.listen_date DESC, pls.listen_count DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );
    return rows;
  }

  // Delete old stats (cleanup job)
  static async deleteOldStats(daysToKeep = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    const [result] = await db.execute(
      'DELETE FROM premium_listening_stats WHERE listen_date < ?',
      [cutoffDateStr]
    );
    
    return result.affectedRows;
  }
}

module.exports = PremiumListeningStatsModel;

