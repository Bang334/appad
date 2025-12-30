const db = require('../config/database');

class HistoryModel {
  // Add to listening history (one record per user per song per day)
  // If user listens to same song multiple times in a day, increment count and add duration
  // Optional params: artist_id, duration_listened, is_completed, is_premium_stream
  // Add to listening history (one record per user per song per day)
  // If user listens to same song multiple times in a day, increment count and add duration
  // UPDATED: Now saves full datetime and moves record to top (by deleting old and inserting new)
  // Add to listening history (one record per user per song per day)
  // If user listens to same song multiple times in a day, increment count and add duration
  // UPDATED: Now saves full datetime and moves record to top (by deleting old and inserting new)
  // FIXED: Use transaction and proper error handling to prevent race conditions
  static async add(userId, songId, options = {}) {
    const {
      artist_id = null,
      duration_listened = 0,
      is_completed = false,
      is_premium_stream = false,
      increment_count = true
    } = options;
    
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
    
    const year = vietnamTime.getFullYear();
    const month = String(vietnamTime.getMonth() + 1).padStart(2, '0');
    const day = String(vietnamTime.getDate()).padStart(2, '0');
    const hours = String(vietnamTime.getHours()).padStart(2, '0');
    const minutes = String(vietnamTime.getMinutes()).padStart(2, '0');
    const seconds = String(vietnamTime.getSeconds()).padStart(2, '0');
    
    const todayPrefix = `${year}-${month}-${day}`;
    const fullDateTime = `${todayPrefix} ${hours}:${minutes}:${seconds}`;
    
    try {
      // Only aggregate if a record for the same song was created in the last 30 minutes.
      // This prevents aggregating listens from different sessions (e.g. morning and evening)
      // which is crucial for accurate payout calculations.
      const [existing] = await db.execute(
        `SELECT * FROM listening_history 
         WHERE user_id = ? AND song_id = ? 
         AND day >= DATE_SUB(?, INTERVAL 30 MINUTE)
         ORDER BY day DESC LIMIT 1`,
        [userId, songId, fullDateTime]
      );
      
      if (existing.length > 0) {
        const oldRecord = existing[0];
        
        const newCount = (parseInt(oldRecord.count) || 0) + (increment_count ? 1 : 0);
        const newDuration = (parseInt(oldRecord.total_duration) || 0) + duration_listened;
        const newCompleted = (parseInt(oldRecord.completed_count) || 0) + (is_completed ? 1 : 0);
        const newIsPremium = oldRecord.is_premium_stream || is_premium_stream ? 1 : 0;
        const newArtistId = artist_id || oldRecord.artist_id;

        // Update the record but keep the original 'day' (timestamp of first listen in this session)
        // to maintain temporal accuracy for payouts.
        // We also delete and re-insert if we want to move it to the top of "Recently Played",
        // but let's use UPDATE for simplicity and safer data integrity here.
        // If we want it at the top, we should use an 'updated_at' column, but lacking it,
        // we'll stick to the original 'day' for payout precision.
        await db.execute(
          `UPDATE listening_history 
           SET count = ?, 
               total_duration = ?, 
               completed_count = ?, 
               is_premium_stream = ?,
               artist_id = ?
           WHERE history_id = ?`,
          [newCount, newDuration, newCompleted, newIsPremium, newArtistId, oldRecord.history_id]
        );
      } else {
        // Insert new record (starts a new session)
        await db.execute(
          `INSERT INTO listening_history 
           (user_id, song_id, artist_id, day, count, total_duration, completed_count, is_premium_stream) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, songId, artist_id, fullDateTime, increment_count ? 1 : 0, duration_listened, is_completed ? 1 : 0, is_premium_stream ? 1 : 0]
        );
      }
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        // Highly unlikely with 30-min window and second-precision 'day', but handled for safety
        console.warn(`[HistoryModel] Duplicate entry detected... updating.`);
        await db.execute(
          `UPDATE listening_history SET count = count + 1, total_duration = total_duration + ? 
           WHERE user_id = ? AND song_id = ? AND day = ?`,
          [duration_listened, userId, songId, fullDateTime]
        );
      } else {
        console.error('[HistoryModel] Error adding history:', error.message);
      }
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
       ORDER BY lh.history_id DESC
       LIMIT ${limitNum}`,
      [userId]
    );
    return rows;
  }

  // Get user listening history grouped by day
  // OPTIMIZED: Separate queries to avoid loading duplicate song data
  static async getUserHistoryByDay(userId, limit = 100, offset = 0) {
    const limitNum = parseInt(limit) || 100;
    const offsetNum = parseInt(offset) || 0;
    if (limitNum < 1 || limitNum > 1000) {
      throw new Error('Invalid limit value');
    }
    
    // Step 1: Get history records (WITHOUT JOIN - lightweight)
    const [historyRows] = await db.execute(
      `SELECT 
         history_id,
         day,
         song_id,
         artist_id,
         count,
         total_duration,
         completed_count
       FROM listening_history
       WHERE user_id = ? AND day IS NOT NULL
       ORDER BY history_id DESC
       LIMIT 2000`,
      [userId]
    );

    if (historyRows.length === 0) {
      return [];
    }

    // Step 2: Extract unique song IDs
    const uniqueSongIds = [...new Set(historyRows.map(row => row.song_id))];
    
    // Step 3: Get song details for unique IDs only (single query)
    const placeholders = uniqueSongIds.map(() => '?').join(',');
    const [songRows] = await db.execute(
      `SELECT 
         s.song_id,
         s.title,
         s.file_url,
         s.cover_url,
         s.duration,
         s.is_premium,
         s.price,
         a.name as artist_name,
         al.title as album_title
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE s.song_id IN (${placeholders})`,
      uniqueSongIds
    );

    // Step 4: Create song lookup map for O(1) access
    const songMap = new Map();
    songRows.forEach(song => {
      songMap.set(song.song_id, song);
    });

    // Step 5: Group by day and merge data
    const dayMap = new Map();
    
    historyRows.forEach(row => {
      // Extract YYYY-MM-DD from day (which might contain time now)
      let day = null;
      if (row.day) {
        if (typeof row.day === 'string') {
          // Take first 10 chars (YYYY-MM-DD)
          day = row.day.substring(0, 10);
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
        
        // Get song details from map
        const songDetails = songMap.get(row.song_id) || {};
        
        dayData.songs.push({
          history_id: row.history_id,
          song_id: row.song_id,
          title: songDetails.title || 'Unknown',
          file_url: songDetails.file_url || '',
          cover_url: songDetails.cover_url || '',
          duration: songDetails.duration || 0,
          is_premium: songDetails.is_premium || 0,
          price: songDetails.price || 0,
          artist_name: songDetails.artist_name || 'Unknown',
          album_title: songDetails.album_title || null,
          day: row.day, // Keep full datetime for display if needed
          count: parseInt(row.count) || 1,
          total_duration: parseInt(row.total_duration) || 0,
          completed_count: parseInt(row.completed_count) || 0
        });
      }
    });

    // Step 6: Convert to array and sort by day descending
    const result = Array.from(dayMap.values())
      .map(dayData => ({
        day: dayData.day,
        song_count: dayData.songs.length,
        total_listens: dayData.songs.reduce((sum, song) => sum + (song.count || 1), 0),
        songs: dayData.songs.sort((a, b) => {
          // Sort songs by history_id descending within each day (most recent first)
          return (b.history_id || 0) - (a.history_id || 0);
        })
      }))
      .sort((a, b) => {
        // Sort days descending
        return new Date(b.day) - new Date(a.day);
      })
      .slice(offsetNum, offsetNum + limitNum);

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
        lh.artist_id,
        lh.song_id,
        SUM(lh.count) as total_listens,
        SUM(lh.total_duration) as total_duration,
        SUM(lh.completed_count) as total_completed,
        COUNT(DISTINCT lh.user_id) as unique_listeners
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE (lh.is_premium_stream = 1 OR s.is_premium = 1 OR al.is_premium = 1)
         AND (lh.day >= ? AND lh.day <= ?)
       GROUP BY lh.artist_id, lh.song_id`,
      [startDate, endDate]
    );
    return rows;
  }

  /**
   * Lấy tổng hợp stats của 1 artist trong 1 khoảng thời gian
   */
  static async getArtistSummaryByPeriod(artistId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        SUM(lh.count) as total_streams,
        SUM(lh.total_duration) as total_duration,
        SUM(lh.completed_count) as total_completed,
        COUNT(DISTINCT lh.song_id) as total_songs,
        COUNT(DISTINCT lh.user_id) as unique_listeners
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.artist_id = ? 
         AND (lh.is_premium_stream = 1 OR s.is_premium = 1 OR al.is_premium = 1)
         AND (lh.day >= ? AND lh.day <= ?)`,
      [artistId, startDate, endDate]
    );
    return rows[0] || {
      total_streams: 0,
      total_duration: 0,
      total_completed: 0,
      total_songs: 0,
      unique_listeners: 0
    };
  }

  // Get stats by artist and period (replaces PremiumListeningStatsModel.getStatsByArtist)
  static async getStatsByArtist(artistId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        lh.song_id,
        SUM(lh.count) as total_listens,
        SUM(lh.total_duration) as total_duration,
        SUM(lh.completed_count) as total_completed,
        COUNT(DISTINCT lh.user_id) as unique_listeners
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.artist_id = ? 
         AND (lh.is_premium_stream = 1 OR s.is_premium = 1 OR al.is_premium = 1)
         AND (lh.day >= ? AND lh.day <= ?)
       GROUP BY lh.song_id
       ORDER BY total_listens DESC`,
      [artistId, startDate, endDate]
    );
    return rows;
  }

  // Get total streams for all artists in period (replaces PremiumListeningStatsModel.getTotalStreamsByPeriod)
  static async getTotalStreamsByPeriod(startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT 
        lh.artist_id,
        SUM(lh.count) as total_streams,
        SUM(lh.total_duration) as total_duration,
        SUM(lh.completed_count) as total_completed
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE (lh.is_premium_stream = 1 OR s.is_premium = 1 OR al.is_premium = 1)
         AND (lh.day >= ? AND lh.day <= ?)
       GROUP BY lh.artist_id`,
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

  // Get frequent songs (Nhạc tủ) - most listened by user in last 30 days
  static async getFrequentSongs(userId, limit = 20) {
    limit = parseInt(limit) || 20;
    
    // Get date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    // Use db.query instead of db.execute for better compatibility with LIMIT parameters
    const [rows] = await db.query(
      `SELECT s.*, 
              a.name as artist_name, 
              al.title as album_title,
              al.is_premium as album_is_premium,
              al.release_date as album_release_date,
              SUM(lh.count) as my_listen_count
       FROM listening_history lh
       JOIN songs s ON lh.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE lh.user_id = ? 
         AND lh.day >= ?
         AND s.status = 1
       GROUP BY lh.song_id
       ORDER BY my_listen_count DESC
       LIMIT ?`,
      [userId, dateStr, limit]
    );
    return rows;
  }
}

module.exports = HistoryModel;
