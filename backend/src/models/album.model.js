const db = require('../config/database');

class AlbumModel {
  // Create new album
  static async create(albumData) {
    const { title, artist_id, release_date, cover_url, is_premium, price } = albumData;
    const [result] = await db.execute(
      'INSERT INTO albums (title, artist_id, release_date, cover_url, is_premium, price) VALUES (?, ?, ?, ?, ?, ?)',
      [title, artist_id || null, release_date || null, cover_url || null, is_premium || 0, price || 0]
    );
    return result.insertId;
  }

  // Get album by ID
  static async findById(albumId) {
    const [rows] = await db.execute(
      `SELECT al.*, a.name as artist_name
       FROM albums al
       LEFT JOIN artists a ON al.artist_id = a.artist_id
       WHERE al.album_id = ?`,
      [albumId]
    );
    return rows[0];
  }

  // Get all albums
  static async findAll(limit = 50, offset = 0, includeUnreleased = false) {
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
    const offsetNum = Math.max(0, parseInt(offset) || 0);
    
    // Get current date for comparison
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const params = [];

    let query = `SELECT al.*, 
              a.name as artist_name,
              COUNT(s.song_id) as song_count
       FROM albums al
       LEFT JOIN artists a ON al.artist_id = a.artist_id
       LEFT JOIN songs s ON al.album_id = s.album_id`;

    if (!includeUnreleased) {
      query += ` WHERE al.release_date <= ?`;
      params.push(now);
    }

    query += ` GROUP BY al.album_id, al.title, al.artist_id, al.release_date, al.cover_url, al.is_premium, al.price, a.name
       ORDER BY al.release_date DESC
       LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [rows] = await db.execute(query, params);
    
    // Convert song_count to number
    return rows.map(row => ({
      ...row,
      song_count: parseInt(row.song_count) || 0
    }));
  }

  // Get album songs
  static async getSongs(albumId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.album_id = ?`,
      [albumId]
    );
    return rows;
  }

  // Get albums by artist with song count
  static async findByArtist(artistId, includeUnreleased = false) {
    let query = `SELECT al.*, 
              COUNT(s.song_id) as song_count,
              EXTRACT(YEAR FROM al.release_date) as release_year
       FROM albums al
       LEFT JOIN songs s ON al.album_id = s.album_id
       WHERE al.artist_id = ?`;

    const params = [artistId];

    if (!includeUnreleased) {
      query += ` AND al.release_date <= ?`;
      params.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    }

    query += ` GROUP BY al.album_id
       ORDER BY al.release_date DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  // Update album
  static async update(albumId, albumData) {
    const fields = [];
    const values = [];

    Object.keys(albumData).forEach(key => {
      if (albumData[key] !== undefined && key !== 'album_id') {
        fields.push(`${key} = ?`);
        values.push(albumData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(albumId);
    const [result] = await db.execute(
      `UPDATE albums SET ${fields.join(', ')} WHERE album_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete album
  static async delete(albumId) {
    const [result] = await db.execute(
      'DELETE FROM albums WHERE album_id = ?',
      [albumId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = AlbumModel;

