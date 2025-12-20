const db = require('../config/database');

/**
 * Job to check and release scheduled songs
 * Runs automatically to switch status from 0 (Hidden) to 1 (Active)
 * when the release_date is reached/passed.
 */
class SongReleaseJob {
  static async checkAndRelease() {
    try {
      const [result] = await db.execute(
        `UPDATE songs 
         SET status = 1 
         WHERE status = 0 
         AND release_date IS NOT NULL 
         AND release_date <= NOW()`
      );

      if (result.affectedRows > 0) {
        console.log(`[SongReleaseJob] Released ${result.affectedRows} songs successfully.`);
        return { released_count: result.affectedRows };
      }
      
      return { released_count: 0 };
    } catch (error) {
      console.error('[SongReleaseJob] Error releasing songs:', error);
      return { error: error.message };
    }
  }
}

module.exports = SongReleaseJob;
