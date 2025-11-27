const db = require('../config/database');

class GenreModel {
  // Create new genre
  static async create(genreData) {
    const { name, description } = genreData;
    const [result] = await db.execute(
      'INSERT INTO genres (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    return result.insertId;
  }

  // Get genre by ID
  static async findById(genreId) {
    const [rows] = await db.execute(
      'SELECT * FROM genres WHERE genre_id = ?',
      [genreId]
    );
    return rows[0];
  }

  // Get all genres
  static async findAll() {
    const rows = await db.query('SELECT * FROM genres ORDER BY name');
    return rows[0];
  }

  // Get all genres with song count
  static async findAllWithSongCount() {
    const [rows] = await db.execute(
      `SELECT 
        g.genre_id,
        g.name,
        g.description,
        COUNT(s.song_id) as song_count
      FROM genres g
      LEFT JOIN songs s ON g.genre_id = s.genre_id
      GROUP BY g.genre_id, g.name, g.description
      ORDER BY g.name`
    );
    return rows;
  }

  // Update genre
  static async update(genreId, genreData) {
    const fields = [];
    const values = [];

    Object.keys(genreData).forEach(key => {
      if (genreData[key] !== undefined && key !== 'genre_id') {
        fields.push(`${key} = ?`);
        values.push(genreData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(genreId);
    const [result] = await db.execute(
      `UPDATE genres SET ${fields.join(', ')} WHERE genre_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete genre
  static async delete(genreId) {
    const [result] = await db.execute(
      'DELETE FROM genres WHERE genre_id = ?',
      [genreId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = GenreModel;

