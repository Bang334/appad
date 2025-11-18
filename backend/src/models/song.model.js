const db = require('../config/database');

class SongModel {
  // Create new song
  static async create(songData) {
    const { title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date } = songData;
    const [result] = await db.execute(
      'INSERT INTO songs (title, artist_id, album_id, genre_id, duration, file_url, cover_url, release_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [title, artist_id || null, album_id || null, genre_id || null, duration, file_url, cover_url || null, release_date || null]
    );
    return result.insertId;
  }

  // Get song by ID
  static async findById(songId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.song_id = ?`,
      [songId]
    );
    return rows[0];
  }

  // Get all songs with pagination
  static async findAll(limit = 20, offset = 0) {
    limit = parseInt(limit) || 20;
    offset = parseInt(offset) || 0;
    const [rows] = await db.query(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       ORDER BY s.song_id DESC
       LIMIT ${limit} OFFSET ${offset}`
    );
    return rows;
  }

  // Search songs
  static async search(keyword, limit = 20) {
    limit = parseInt(limit) || 20;
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.title LIKE ? OR a.name LIKE ?
       LIMIT ${limit}`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  }

  // Get songs by artist
  static async findByArtist(artistId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.artist_id = ?`,
      [artistId]
    );
    return rows;
  }

  // Get songs by album
  static async findByAlbum(albumId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.album_id = ?
       ORDER BY s.song_id ASC`,
      [albumId]
    );
    return rows;
  }

  // Get songs by genre
  static async findByGenre(genreId) {
    const [rows] = await db.execute(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       WHERE s.genre_id = ?`,
      [genreId]
    );
    return rows;
  }

  // Get trending songs (most listened)
  static async getTrending(limit = 10) {
    limit = parseInt(limit) || 10;
    const [rows] = await db.query(
      `SELECT s.*, a.name as artist_name, al.title as album_title, g.name as genre_name
       FROM songs s
       LEFT JOIN artists a ON s.artist_id = a.artist_id
       LEFT JOIN albums al ON s.album_id = al.album_id
       LEFT JOIN genres g ON s.genre_id = g.genre_id
       ORDER BY s.listen_count DESC
       LIMIT ${limit}`
    );
    return rows;
  }

  // Update song
  static async update(songId, songData) {
    const fields = [];
    const values = [];

    Object.keys(songData).forEach(key => {
      if (songData[key] !== undefined && key !== 'song_id') {
        fields.push(`${key} = ?`);
        values.push(songData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(songId);
    const [result] = await db.execute(
      `UPDATE songs SET ${fields.join(', ')} WHERE song_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Increment listen count
  static async incrementListenCount(songId) {
    const [result] = await db.execute(
      'UPDATE songs SET listen_count = listen_count + 1 WHERE song_id = ?',
      [songId]
    );
    return result.affectedRows > 0;
  }

  // Delete song
  static async delete(songId) {
    const [result] = await db.execute(
      'DELETE FROM songs WHERE song_id = ?',
      [songId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = SongModel;

