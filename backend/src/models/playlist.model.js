const db = require('../config/database');

class PlaylistModel {
  // Create new playlist
  static async create(playlistData) {
    const { user_id, name, description } = playlistData;
    const [result] = await db.execute(
      'INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)',
      [user_id, name, description || null]
    );
    return result.insertId;
  }

  // Get playlist by ID
  static async findById(playlistId) {
    const [rows] = await db.execute(
      `SELECT p.*, u.username, u.avatar_url as user_avatar
       FROM playlists p
       JOIN users u ON p.user_id = u.user_id
       WHERE p.playlist_id = ?`,
      [playlistId]
    );
    return rows[0];
  }

  // Get all playlists
  static async findAll(limit = 50, offset = 0) {
    const [rows] = await db.execute(
      `SELECT p.*, u.username, COUNT(ps.song_id) as song_count
       FROM playlists p
       LEFT JOIN users u ON p.user_id = u.user_id
       LEFT JOIN playlist_songs ps ON p.playlist_id = ps.playlist_id
       GROUP BY p.playlist_id, p.name, p.description, p.created_at, u.username
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return rows;
  }

  // Get user playlists
  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT p.*, COUNT(ps.song_id) as song_count
       FROM playlists p
       LEFT JOIN playlist_songs ps ON p.playlist_id = ps.playlist_id
       WHERE p.user_id = ?
       GROUP BY p.playlist_id
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Get playlist songs
  static async getSongs(playlistId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title
       FROM playlist_songs ps
       JOIN songs s ON ps.song_id = s.song_id
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       WHERE ps.playlist_id = ?`,
      [playlistId]
    );
    return rows;
  }

  // Add song to playlist
  static async addSong(playlistId, songId) {
    try {
      await db.execute(
        'INSERT INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)',
        [playlistId, songId]
      );
      return true;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return false; // Song already in playlist
      }
      throw error;
    }
  }

  // Remove song from playlist
  static async removeSong(playlistId, songId) {
    const [result] = await db.execute(
      'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
      [playlistId, songId]
    );
    return result.affectedRows > 0;
  }

  // Update playlist
  static async update(playlistId, playlistData) {
    const fields = [];
    const values = [];

    Object.keys(playlistData).forEach(key => {
      if (playlistData[key] !== undefined && key !== 'playlist_id' && key !== 'user_id') {
        fields.push(`${key} = ?`);
        values.push(playlistData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(playlistId);
    const [result] = await db.execute(
      `UPDATE playlists SET ${fields.join(', ')} WHERE playlist_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete playlist
  static async delete(playlistId) {
    const [result] = await db.execute(
      'DELETE FROM playlists WHERE playlist_id = ?',
      [playlistId]
    );
    return result.affectedRows > 0;
  }

  // Check if user owns playlist
  static async isOwner(playlistId, userId) {
    const [rows] = await db.execute(
      'SELECT user_id FROM playlists WHERE playlist_id = ?',
      [playlistId]
    );
    return rows[0]?.user_id === userId;
  }
}

module.exports = PlaylistModel;

