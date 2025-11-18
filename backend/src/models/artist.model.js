const db = require('../config/database');

class ArtistModel {
  // Create new artist
  static async create(artistData) {
    const { name, bio, image_url, country } = artistData;
    const [result] = await db.execute(
      'INSERT INTO artists (name, bio, image_url, country) VALUES (?, ?, ?, ?)',
      [name, bio || null, image_url || null, country || null]
    );
    return result.insertId;
  }

  // Get artist by ID
  static async findById(artistId) {
    const [rows] = await db.execute(
      'SELECT * FROM artists WHERE artist_id = ?',
      [artistId]
    );
    return rows[0];
  }

  // Get all artists
  static async findAll(limit = 50, offset = 0) {
    const rows = await db.query(
      'SELECT * FROM artists LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    return rows[0];
  }

  // Search artists
  static async search(keyword, limit = 20) {
    const rows = await db.query(
      'SELECT * FROM artists WHERE name LIKE ? LIMIT ?',
      [`%${keyword}%`, parseInt(limit)]
    );
    return rows[0];
  }

  // Update artist
  static async update(artistId, artistData) {
    const fields = [];
    const values = [];

    Object.keys(artistData).forEach(key => {
      if (artistData[key] !== undefined && key !== 'artist_id') {
        fields.push(`${key} = ?`);
        values.push(artistData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(artistId);
    const [result] = await db.execute(
      `UPDATE artists SET ${fields.join(', ')} WHERE artist_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete artist
  static async delete(artistId) {
    const [result] = await db.execute(
      'DELETE FROM artists WHERE artist_id = ?',
      [artistId]
    );
    return result.affectedRows > 0;
  }

  // Get artist with song count
  static async getWithSongCount(artistId) {
    const [rows] = await db.execute(
      `SELECT a.*, COUNT(s.song_id) as song_count
       FROM artists a
       LEFT JOIN songs s ON a.artist_id = s.artist_id
       WHERE a.artist_id = ?
       GROUP BY a.artist_id`,
      [artistId]
    );
    return rows[0];
  }
}

module.exports = ArtistModel;

