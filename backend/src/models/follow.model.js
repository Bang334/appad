const db = require('../config/database');

class FollowModel {
  // Follow an artist
  static async followArtist(userId, artistId) {
    try {
      await db.execute(
        'INSERT INTO follows (user_id, artist_id) VALUES (?, ?)',
        [userId, artistId]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return false; // Already following
      }
      throw error;
    }
  }

  // Unfollow an artist
  static async unfollowArtist(userId, artistId) {
    const [result] = await db.execute(
      'DELETE FROM follows WHERE user_id = ? AND artist_id = ?',
      [userId, artistId]
    );
    return result.affectedRows > 0;
  }

  // Check if user is following artist
  static async isFollowing(userId, artistId) {
    const [rows] = await db.execute(
      'SELECT * FROM follows WHERE user_id = ? AND artist_id = ?',
      [userId, artistId]
    );
    return rows.length > 0;
  }

  // Get user's followed artists
  static async getUserFollowedArtists(userId) {
    const [rows] = await db.execute(
      `SELECT a.*, 
              COUNT(DISTINCT s.song_id) as song_count,
              COUNT(DISTINCT al.album_id) as album_count
       FROM follows f
       JOIN artists a ON f.artist_id = a.artist_id
       LEFT JOIN songs s ON a.artist_id = s.artist_id
       LEFT JOIN albums al ON a.artist_id = al.artist_id
       WHERE f.user_id = ?
       GROUP BY a.artist_id
       ORDER BY a.name ASC`,
      [userId]
    );
    return rows;
  }

  // Get user's followed artists with top songs
  static async getFollowedArtistsWithSongs(userId, songLimit = 3) {
    const artists = await this.getUserFollowedArtists(userId);
    const SongModel = require('./song.model');
    
    // Enrich with top songs
    // We use Promise.all to fetch songs for all artists in parallel
    const enrichedArtists = await Promise.all(artists.map(async artist => {
      const topSongs = await SongModel.findTopSongsByArtist(artist.artist_id, songLimit);
      return { ...artist, top_songs: topSongs };
    }));
    
    return enrichedArtists;
  }

  // Get artist's followers
  static async getArtistFollowers(artistId, limit = 50, offset = 0) {
    // Validate inputs
    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;
    
    // Use interpolation for LIMIT/OFFSET to avoid prepared statement issues in some MySQL versions
    const [rows] = await db.execute(
      `SELECT u.user_id, u.username, u.full_name, u.avatar_url
       FROM follows f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.artist_id = ?
       ORDER BY u.username ASC
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [artistId]
    );
    return rows;
  }

  // Get follower count
  static async getFollowerCount(artistId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM follows WHERE artist_id = ?',
      [artistId]
    );
    return rows[0].count;
  }

  // Get user's following count
  static async getFollowingCount(userId) {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as count FROM follows WHERE user_id = ?',
      [userId]
    );
    return rows[0].count;
  }

  // Get recent followers (for notifications)
  static async getRecentFollowers(artistId, limit = 10) {
    const [rows] = await db.execute(
      `SELECT u.user_id, u.username, u.full_name, u.avatar_url
       FROM follows f
       JOIN users u ON f.user_id = u.user_id
       WHERE f.artist_id = ?
       ORDER BY u.user_id DESC
       LIMIT ?`,
      [artistId, limit]
    );
    return rows;
  }
}

module.exports = FollowModel;

