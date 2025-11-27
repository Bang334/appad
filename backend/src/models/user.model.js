const db = require('../config/database');

class UserModel {
  // Create new user
  static async create(userData) {
    const { username, email, password, full_name, avatar_url, role, is_banned } = userData;
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, full_name, avatar_url, role, is_banned) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        username,
        email,
        password,
        full_name || null,
        avatar_url || null,
        role || 'user',
        // 0: bình thường, 1: bị cấm, 2: chờ duyệt nghệ sĩ
        is_banned != null ? is_banned : 0,
      ]
    );
    return result.insertId;
  }

  // Find user by ID
  static async findById(userId) {
    const [rows] = await db.execute(
      'SELECT user_id, username, email, full_name, avatar_url, role, background_video_url, created_at FROM users WHERE user_id = ?',
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
      'SELECT user_id, username, email, full_name, avatar_url, role, is_premium, premium_expiry, background_video_url, created_at FROM users LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );
    return rows;
  }

  // Subscribe to premium
  static async subscribePremium(userId, durationDays = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    
    const [result] = await db.execute(
      'UPDATE users SET is_premium = 1, premium_expiry = ? WHERE user_id = ?',
      [expiryDate, userId]
    );
    return result.affectedRows > 0;
  }

  // Check if user has active premium
  static async isPremiumActive(userId) {
    const [rows] = await db.execute(
      'SELECT is_premium, premium_expiry FROM users WHERE user_id = ?',
      [userId]
    );
    
    const user = rows[0];
    if (!user || !user.is_premium) return false;
    
    if (user.premium_expiry && new Date(user.premium_expiry) > new Date()) {
      return true;
    }
    
    // If expired, update user status
    await db.execute(
      'UPDATE users SET is_premium = 0 WHERE user_id = ?',
      [userId]
    );
    return false;
  }

  // Cancel premium subscription
  static async cancelPremium(userId) {
    const [result] = await db.execute(
      'UPDATE users SET is_premium = 0, premium_expiry = NULL WHERE user_id = ?',
      [userId]
    );
    return result.affectedRows > 0;
  }

  // Get premium expiry date
  static async getPremiumExpiry(userId) {
    const [rows] = await db.execute(
      'SELECT premium_expiry FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0]?.premium_expiry;
  }

  // Get total premium users count (analytics)
  static async getPremiumUsersCount() {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as premium_count FROM users WHERE is_premium = 1 AND premium_expiry > NOW()'
    );
    return rows[0]?.premium_count || 0;
  }

  // Wallet methods
  // Get user balance
  static async getBalance(userId) {
    const [rows] = await db.execute(
      'SELECT balance FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0]?.balance || 0;
  }

  // Add balance
  static async addBalance(userId, amount) {
    const [result] = await db.execute(
      'UPDATE users SET balance = balance + ? WHERE user_id = ?',
      [amount, userId]
    );
    return { success: result.affectedRows > 0 };
  }

  // Subtract balance (for purchases)
  static async subtractBalance(userId, amount) {
    // Check if user has enough balance first
    const balance = await this.getBalance(userId);
    if (balance < amount) {
      return { success: false, message: 'Insufficient balance' };
    }

    const [result] = await db.execute(
      'UPDATE users SET balance = balance - ? WHERE user_id = ?',
      [amount, userId]
    );
    return { success: result.affectedRows > 0 };
  }

  // Get wallet balance with user info
  static async getWalletInfo(userId) {
    const [rows] = await db.execute(
      'SELECT user_id, username, email, balance FROM users WHERE user_id = ?',
      [userId]
    );
    return rows[0];
  }
}

module.exports = UserModel;

