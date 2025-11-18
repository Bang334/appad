const db = require('../config/database');

class AlbumModel {
  // Create new album
  static async create(albumData) {
    const { title, artist_id, release_date, cover_url } = albumData;
    const [result] = await db.execute(
      'INSERT INTO albums (title, artist_id, release_date, cover_url) VALUES (?, ?, ?, ?)',
      [title, artist_id || null, release_date || null, cover_url || null]
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
  static async findAll(limit = 50, offset = 0) {
    const rows = await db.query(
      `SELECT al.*, a.name as artist_name
       FROM albums al
       LEFT JOIN artists a ON al.artist_id = a.artist_id
       ORDER BY al.album_id DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    return rows[0];
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

  // Get albums by artist
  static async findByArtist(artistId) {
    const [rows] = await db.execute(
      'SELECT * FROM albums WHERE artist_id = ? ORDER BY release_date DESC',
      [artistId]
    );
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

