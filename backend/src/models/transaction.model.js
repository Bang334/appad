const db = require('../config/database');

class TransactionModel {
  // Create new transaction
  static async create(transactionData) {
    const { user_id, type, amount, status, description, reference_code } = transactionData;
    const [result] = await db.execute(
      'INSERT INTO transactions (user_id, type, amount, status, description, reference_code) VALUES (?, ?, ?, ?, ?, ?)',
      [user_id, type, amount, status || 'pending', description || null, reference_code || null]
    );
    return result.insertId;
  }

  // Get transaction by ID
  static async findById(transactionId) {
    const [rows] = await db.execute(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [transactionId]
    );
    return rows[0];
  }

  static async findLatestSubscription(userId) {
    const [rows] = await db.execute(
      `SELECT * FROM transactions
       WHERE user_id = ? AND type = 'subscription' AND status = 'completed'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return rows[0];
  }

  // Get transactions by user
  static async findByUser(userId, limit = 50, offset = 0) {
    // Ensure limit and offset are valid positive integers
    const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000)); // Between 1 and 1000
    const offsetNum = Math.max(0, parseInt(offset) || 0); // Must be >= 0
    
    // MySQL2 has issues with LIMIT/OFFSET as placeholders in prepared statements
    // Using template string with validated numbers is safe here
    const [rows] = await db.execute(
      `SELECT * FROM transactions 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ${limitNum} OFFSET ${offsetNum}`,
      [userId]
    );
    return rows;
  }

  // Get transactions by reference code
  static async findByReferenceCode(referenceCode) {
    const [rows] = await db.execute(
      'SELECT * FROM transactions WHERE reference_code = ?',
      [referenceCode]
    );
    return rows[0];
  }

  // Update transaction status
  static async updateStatus(transactionId, status) {
    const [result] = await db.execute(
      'UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
      [status, transactionId]
    );
    return result.affectedRows > 0;
  }

  // Get pending transactions
  static async getPendingTransactions(userId) {
    const [rows] = await db.execute(
      `SELECT * FROM transactions 
       WHERE user_id = ? AND status = 'pending' 
       ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  }

  // Get total deposited amount by user
  static async getTotalDeposited(userId) {
    const [rows] = await db.execute(
      `SELECT SUM(amount) as total_deposited 
       FROM transactions 
       WHERE user_id = ? AND type = 'deposit' AND status = 'completed'`,
      [userId]
    );
    return rows[0]?.total_deposited || 0;
  }

  // Get transaction statistics
  static async getStatistics(userId) {
    const [rows] = await db.execute(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_deposited,
        COALESCE(SUM(CASE WHEN type = 'purchase' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_spent,
        COALESCE(SUM(CASE WHEN type = 'subscription' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_subscription
       FROM transactions 
       WHERE user_id = ?`,
      [userId]
    );
    
    // Ensure all values are properly parsed as numbers
    const result = rows[0];
    return {
      total_transactions: parseInt(result.total_transactions) || 0,
      total_deposited: parseFloat(result.total_deposited) || 0,
      total_spent: parseFloat(result.total_spent) || 0,
      total_subscription: parseFloat(result.total_subscription) || 0
    };
  }
}

module.exports = TransactionModel;

