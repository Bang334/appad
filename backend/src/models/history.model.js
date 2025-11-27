const db = require('../config/database');

class HistoryModel {
  // Add to listening history (one record per user per song per day)
  // If user listens to same song multiple times in a day, increment count and add duration
  // Optional params: artist_id, duration_listened, is_completed, is_premium_stream
  static async add(userId, songId, options = {}) {
    const {
      artist_id = null,
      duration_listened = 0,
      is_completed = false,
      is_premium_stream = false,
      increment_count = true
    } = options;
    
    // Get current date in Vietnam timezone (UTC+7)
    // Use toLocaleString with timezone to get accurate Vietnam date
    const now = new Date();
    const vietnamDateStr = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Parse the formatted string (format: MM/DD/YYYY)
    const [month, day, year] = vietnamDateStr.split('/');
    const todayStr = `${year}-${month}-${day}`;
    
    // Check if record exists for today
    const [existing] = await db.execute(
      `SELECT history_id FROM listening_history 
       WHERE user_id = ? AND song_id = ? AND day = ?
       LIMIT 1`,
      [userId, songId, todayStr]
    );
    
    if (existing.length > 0) {
      // Update existing record: increment count (if requested), add duration and completed
      await db.execute(
        `UPDATE listening_history 
         SET count = count + ?,
             total_duration = total_duration + ?,
             completed_count = completed_count + ?,
             is_premium_stream = GREATEST(is_premium_stream, ?),
             artist_id = COALESCE(?, artist_id)
         WHERE history_id = ?`,
        [increment_count ? 1 : 0, duration_listened, is_completed ? 1 : 0, is_premium_stream ? 1 : 0, artist_id, existing[0].history_id]
      );
    } else {
      // Insert new record
      await db.execute(
        `INSERT INTO listening_history 
         (user_id, song_id, artist_id, day, count, total_duration, completed_count, is_premium_stream) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, songId, artist_id, todayStr, increment_count ? 1 : 0, duration_listened, is_completed ? 1 : 0, is_premium_stream ? 1 : 0]
      );
    }
    return true;
  }

  // Get user listening history
  static async getUserHistory(userId, limit = 50) {
    const limitNum = parseInt(limit) || 50;
    if (limitNum < 1 || limitNum > 1000) {
      throw new Error('Invalid limit value');
    }
    const [rows] = await db.execute(
      `SELECT lh.*, s.title, s.file_url, s.cover_url, s.duration,
              a.name as artist_name, al.title as album_title
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ? AND lh.day IS NOT NULL
       ORDER BY lh.day DESC, lh.history_id DESC
       LIMIT ${limitNum}`,
      [userId]
    );
    return rows;
  }

  // Get user listening history grouped by day
  static async getUserHistoryByDay(userId, limit = 100) {
    const limitNum = parseInt(limit) || 100;
    if (limitNum < 1 || limitNum > 1000) {
      throw new Error('Invalid limit value');
    }
    
    // Get all history records first
    const [allRows] = await db.execute(
      `SELECT 
         lh.history_id,
         lh.day,
         lh.song_id,
         lh.count,
         lh.total_duration,
         lh.completed_count,
         s.title,
         s.file_url,
         s.cover_url,
         s.duration,
         s.is_premium,
         s.price,
         a.name as artist_name,
         al.title as album_title
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ? AND lh.day IS NOT NULL
       ORDER BY lh.day DESC, lh.history_id DESC`,
      [userId]
    );

    // Group by day in application level
    const dayMap = new Map();
    
    allRows.forEach(row => {
      // Convert date to YYYY-MM-DD format in Vietnam timezone (UTC+7)
      let day = null;
      if (row.day) {
        if (typeof row.day === 'string') {
          day = row.day;
        } else {
          // Convert Date object to Vietnam timezone string (YYYY-MM-DD)
          const vietnamDateStr = row.day.toLocaleString('en-US', { 
            timeZone: 'Asia/Ho_Chi_Minh',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          const [month, dayPart, year] = vietnamDateStr.split('/');
          day = `${year}-${month}-${dayPart}`;
        }
      }
      if (!day) return;
      
      if (!dayMap.has(day)) {
        dayMap.set(day, {
          day: day,
          songs: [],
          songIds: new Set()
        });
      }
      
      const dayData = dayMap.get(day);
      
      // Only add unique songs per day (keep the latest one with count)
      if (!dayData.songIds.has(row.song_id)) {
        dayData.songIds.add(row.song_id);
        dayData.songs.push({
          history_id: row.history_id,
          song_id: row.song_id,
          title: row.title,
          file_url: row.file_url,
          cover_url: row.cover_url,
          duration: row.duration,
          is_premium: row.is_premium,
          price: row.price,
          artist_name: row.artist_name,
          album_title: row.album_title,
          day: day,
          count: parseInt(row.count) || 1,
          total_duration: parseInt(row.total_duration) || 0,
          completed_count: parseInt(row.completed_count) || 0
        });
      }
    });

    // Convert to array and sort by day descending
    const result = Array.from(dayMap.values())
      .map(dayData => ({
        day: dayData.day,
        song_count: dayData.songs.length,
        total_listens: dayData.songs.reduce((sum, song) => sum + (song.count || 1), 0), // Sum of all counts
        songs: dayData.songs.sort((a, b) => {
          // Sort songs by history_id descending within each day (most recent first)
          return (b.history_id || 0) - (a.history_id || 0);
        })
      }))
      .sort((a, b) => {
        // Sort days descending
        return new Date(b.day) - new Date(a.day);
      })
      .slice(0, limitNum);

    return result;
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
    const limitNum = parseInt(limit) || 20;
    if (limitNum < 1 || limitNum > 1000) {
      throw new Error('Invalid limit value');
    }
    const [rows] = await db.execute(
      `SELECT DISTINCT s.*, a.name as artist_name, al.title as album_title,
              MAX(lh.day) as last_played
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ? AND lh.day IS NOT NULL
       GROUP BY s.song_id
       ORDER BY last_played DESC
       LIMIT ${limitNum}`,
      [userId]
    );
    return rows;
  }

  // Get stats by period (replaces PremiumListeningStatsModel.getStatsByPeriod)
  static async getStatsByPeriod(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        artist_id,
        song_id,
        SUM(count) as total_listens,
        SUM(total_duration) as total_duration,
        SUM(completed_count) as total_completed,
        COUNT(DISTINCT user_id) as unique_listeners
       FROM listening_history
       WHERE is_premium_stream = 1
         AND day BETWEEN ? AND ?
       GROUP BY artist_id, song_id`,
      [startDate, endDate]
    );
    return rows;
  }

  // Get stats by artist and period (replaces PremiumListeningStatsModel.getStatsByArtist)
  static async getStatsByArtist(artistId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        song_id,
        SUM(count) as total_listens,
        SUM(total_duration) as total_duration,
        SUM(completed_count) as total_completed,
        COUNT(DISTINCT user_id) as unique_listeners
       FROM listening_history
       WHERE artist_id = ? 
         AND is_premium_stream = 1
         AND day BETWEEN ? AND ?
       GROUP BY song_id
       ORDER BY total_listens DESC`,
      [artistId, startDate, endDate]
    );
    return rows;
  }

  // Get total streams for all artists in period (replaces PremiumListeningStatsModel.getTotalStreamsByPeriod)
  static async getTotalStreamsByPeriod(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        artist_id,
        SUM(count) as total_streams
       FROM listening_history
       WHERE is_premium_stream = 1
         AND day BETWEEN ? AND ?
       GROUP BY artist_id`,
      [startDate, endDate]
    );
    return rows;
  }

  // Get monthly stats summary (replaces PremiumListeningStatsModel.getMonthlySummary)
  static async getMonthlySummary(year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
    
    return this.getTotalStreamsByPeriod(startDate, endDate);
  }
}

module.exports = HistoryModel;

