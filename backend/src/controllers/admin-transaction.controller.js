const TransactionModel = require('../models/transaction.model');
const UserModel = require('../models/user.model');
const NotificationModel = require('../models/notification.model');
const db = require('../config/database');

class AdminTransactionController {
  // Get all pending deposit transactions
  static async getPendingDeposits(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
      const offsetNum = Math.max(0, parseInt(offset) || 0);

      const [rows] = await db.execute(
        `SELECT t.*, u.username, u.email, u.full_name
         FROM transactions t
         JOIN users u ON t.user_id = u.user_id
         WHERE t.type = 'deposit' AND t.status = 'pending'
         ORDER BY t.created_at DESC
         LIMIT ${limitNum} OFFSET ${offsetNum}`
      );

      const [countRows] = await db.execute(
        `SELECT COUNT(*) as total
         FROM transactions
         WHERE type = 'deposit' AND status = 'pending'`
      );

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: countRows[0].total,
          limit: limitNum,
          offset: offsetNum
        }
      });
    } catch (error) {
      console.error('Get pending deposits error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get pending deposits count
  static async getPendingDepositsCount(req, res) {
    try {
      const [rows] = await db.execute(
        `SELECT COUNT(*) as count
         FROM transactions
         WHERE type = 'deposit' AND status = 'pending'`
      );

      res.json({
        success: true,
        data: {
          count: rows[0].count
        }
      });
    } catch (error) {
      console.error('Get pending deposits count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Approve deposit transaction (add money to user account)
  static async approveDeposit(req, res) {
    try {
      const { id } = req.params;
      const { admin_note } = req.body;

      const transaction = await TransactionModel.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      if (transaction.type !== 'deposit') {
        return res.status(400).json({
          success: false,
          message: 'Only deposit transactions can be approved'
        });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Transaction is already ${transaction.status}`
        });
      }

      // Add money to user balance
      const addResult = await UserModel.addBalance(transaction.user_id, transaction.amount);
      
      if (!addResult.success) {
        return res.status(400).json({
          success: false,
          message: addResult.message || 'Failed to add balance'
        });
      }

      // Update transaction status
      await TransactionModel.updateStatus(id, 'completed');

      const newBalance = await UserModel.getBalance(transaction.user_id);

      // Create notification for user
      await NotificationModel.create({
        user_id: transaction.user_id,
        type: 'deposit_approved',
        title: 'Nạp tiền thành công',
        message: `Yêu cầu nạp tiền ${parseFloat(transaction.amount).toLocaleString('vi-VN')}đ của bạn đã được duyệt. Số dư hiện tại: ${parseFloat(newBalance).toLocaleString('vi-VN')}đ.${admin_note ? `\nGhi chú: ${admin_note}` : ''}`,
        data: {
          transaction_id: transaction.transaction_id,
          amount: transaction.amount,
          new_balance: newBalance
        }
      });

      res.json({
        success: true,
        message: 'Deposit approved successfully',
        data: {
          transaction_id: transaction.transaction_id,
          amount: transaction.amount,
          user_id: transaction.user_id,
          new_balance: newBalance,
          admin_note: admin_note || null
        }
      });
    } catch (error) {
      console.error('Approve deposit error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Reject deposit transaction
  static async rejectDeposit(req, res) {
    try {
      const { id } = req.params;
      const { admin_note } = req.body;

      const transaction = await TransactionModel.findById(id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      if (transaction.type !== 'deposit') {
        return res.status(400).json({
          success: false,
          message: 'Only deposit transactions can be rejected'
        });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Transaction is already ${transaction.status}`
        });
      }

      // Update transaction status to cancelled
      await TransactionModel.updateStatus(id, 'cancelled');

      // Create notification for user
      await NotificationModel.create({
        user_id: transaction.user_id,
        type: 'deposit_rejected',
        title: 'Nạp tiền bị từ chối',
        message: `Yêu cầu nạp tiền ${parseFloat(transaction.amount).toLocaleString('vi-VN')}đ của bạn đã bị từ chối.${admin_note ? `\nLý do: ${admin_note}` : '\nVui lòng liên hệ admin để biết thêm chi tiết.'}`,
        data: {
          transaction_id: transaction.transaction_id,
          amount: transaction.amount
        }
      });

      res.json({
        success: true,
        message: 'Deposit rejected',
        data: {
          transaction_id: transaction.transaction_id,
          amount: transaction.amount,
          user_id: transaction.user_id,
          admin_note: admin_note || null
        }
      });
    } catch (error) {
      console.error('Reject deposit error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all transactions (with filters)
  static async getAllTransactions(req, res) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        type, 
        status,
        user_id 
      } = req.query;

      const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
      const offsetNum = Math.max(0, parseInt(offset) || 0);

      let query = `
        SELECT t.*, u.username, u.email, u.full_name
        FROM transactions t
        JOIN users u ON t.user_id = u.user_id
        WHERE 1=1
      `;
      const params = [];

      if (type) {
        query += ' AND t.type = ?';
        params.push(type);
      }

      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }

      if (user_id) {
        query += ' AND t.user_id = ?';
        params.push(parseInt(user_id));
      }

      query += ` ORDER BY t.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [rows] = await db.execute(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM transactions WHERE 1=1';
      const countParams = [];
      
      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      if (user_id) {
        countQuery += ' AND user_id = ?';
        countParams.push(parseInt(user_id));
      }

      const [countRows] = await db.execute(countQuery, countParams);

      res.json({
        success: true,
        data: rows,
        pagination: {
          total: countRows[0].total,
          limit: limitNum,
          offset: offsetNum
        }
      });
    } catch (error) {
      console.error('Get all transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = AdminTransactionController;

