const db = require('../config/database');

class UserModel {
  // Create new user
  static async create(userData) {
    const { username, email, password, full_name, avatar_url, role } = userData;
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name, avatar_url, role) VALUES (?, ?, ?, ?, ?, ?)',
      [username, email, password, full_name || null, avatar_url || null, role || 'user']
    );
    return result.insertId;
  }

  // Find user by ID
  static async findById(userId) {
    const [rows] = await db.execute(
      'SELECT user_id, username, email, full_name, avatar_url, role, created_at FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }

  // Find user by email
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  // Update user
  static async update(userId, userData) {
    const fields = [];
    const values = [];

    Object.keys(userData).forEach(key => {
      if (userData[key] !== undefined && key !== 'user_id') {
        fields.push(`${key} = ?`);
        values.push(userData[key]);
      }
    });

    if (fields.length === 0) return false;

    values.push(userId);
    const [result] = await db.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  // Delete user
  static async delete(userId) {
    const [result] = await db.execute(
      'DELETE FROM users WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Get all users (admin only)
  static async findAll(limit = 50, offset = 0) {
    const [rows] = await db.execute(
      'SELECT user_id, username, email, full_name, avatar_url, role, created_at FROM users LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    return rows;
  }
}

module.exports = UserModel;

