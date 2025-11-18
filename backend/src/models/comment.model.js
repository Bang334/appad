const db = require('../config/database');

class CommentModel {
  // Create new comment with rating
  static async create(commentData) {
    const { user_id, song_id, content, rating } = commentData;
    const [result] = await db.execute(
      'INSERT INTO comments (user_id, song_id, content, rating) VALUES (?, ?, ?, ?)',
      [user_id, song_id, content, rating || null]
    );
    return result.insertId;
  }

  // Check if user already commented on song
  static async hasUserCommented(userId, songId) {
    const [rows] = await db.execute(
      'SELECT comment_id FROM comments WHERE user_id = ? AND song_id = ?',
      [userId, songId]
    );
    return rows.length > 0;
  }

  // Get comment by ID
  static async findById(commentId) {
    const [rows] = await db.execute(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.comment_id = ?`,
      [commentId]
    );
    return rows[0];
  }

  // Get song comments
  static async findBySong(songId, limit = 50, offset = 0) {
    const [rows] = await db.query(
      `SELECT c.*, u.username, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.song_id = ?
       ORDER BY c.created_at DESC
       LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`,
      [songId]
    );
    return rows;
  }

  // Get song rating statistics
  static async getSongRatingStats(songId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
       FROM comments 
       WHERE song_id = ? AND rating IS NOT NULL`,
      [songId]
    );
    return rows[0];
  }

  // Get user comments
  static async findByUser(userId, limit = 50) {
    const [rows] = await db.execute(
      `SELECT c.*, s.title as song_title
       FROM comments c
       JOIN songs s ON c.song_id = s.song_id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [userId, parseInt(limit)]
    );
    return rows;
  }

  // Update comment
  static async update(commentId, content, rating) {
    const [result] = await db.execute(
      'UPDATE comments SET content = ?, rating = ? WHERE comment_id = ?',
      [content, rating || null, commentId]
    );
    return result.affectedRows > 0;
  }

  // Delete comment
  static async delete(commentId) {
    const [result] = await db.execute(
      'DELETE FROM comments WHERE comment_id = ?',
      [commentId]
    );
    return result.affectedRows > 0;
  }

  // Check if user owns comment
  static async isOwner(commentId, userId) {
    const [rows] = await db.execute(
      'SELECT user_id FROM comments WHERE comment_id = ?',
      [commentId]
    );
    return rows[0]?.user_id === userId;
  }
}

module.exports = CommentModel;

