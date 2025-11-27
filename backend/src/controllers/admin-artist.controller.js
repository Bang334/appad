const TransactionModel = require('../models/transaction.model');
const ArtistModel = require('../models/artist.model');
const UserModel = require('../models/user.model');
const NotificationModel = require('../models/notification.model');

class AdminArtistController {
  // Get all withdrawal requests (admin)
  static async getAllWithdrawals(req, res) {
    try {
      const { limit = 50, offset = 0, status } = req.query;

      const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
      const offsetNum = Math.max(0, parseInt(offset) || 0);
      
      let query = `
        SELECT 
          t.transaction_id as withdrawal_id,
          t.*, 
          a.artist_id, 
          a.name as artist_name, 
          a.bank_name, 
          a.bank_account, 
          a.bank_account_name,
          t.created_at as requested_at,
          t.updated_at as processed_at
        FROM transactions t
        LEFT JOIN artists a ON a.user_id = t.user_id
        WHERE t.type = 'withdraw'
      `;
      const params = [];

      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }

      query += ` ORDER BY t.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const db = require('../config/database');
      const [withdrawals] = await db.execute(query, params);

      // Get statistics
      const [statsRows] = await db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_completed_amount
        FROM transactions
        WHERE type = 'withdraw'
      `);

      res.json({
        success: true,
        data: {
          withdrawals,
          statistics: statsRows[0] || {}
        }
      });
    } catch (error) {
      console.error('Get all withdrawals error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Approve withdrawal
  static async approveWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.user_id;
      const { admin_note } = req.body;

      // Get withdrawal transaction
      const withdrawal = await TransactionModel.findById(id);

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      if (withdrawal.type !== 'withdraw') {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type'
        });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending withdrawals can be approved'
        });
      }

      // Check user balance
      const userBalance = await UserModel.getBalance(withdrawal.user_id);
      if (userBalance < withdrawal.amount) {
        return res.status(400).json({
          success: false,
          message: 'User has insufficient balance',
          data: {
            required: withdrawal.amount,
            current: userBalance
          }
        });
      }

      // Deduct from user balance
      const deductResult = await UserModel.subtractBalance(withdrawal.user_id, withdrawal.amount);
      if (!deductResult.success) {
        return res.status(400).json({
          success: false,
          message: deductResult.message
        });
      }

      // Update transaction status to completed
      await TransactionModel.updateStatus(id, 'completed');

      // Get new balance
      const newBalance = await UserModel.getBalance(withdrawal.user_id);

      // Create notification for user
      await NotificationModel.create({
        user_id: withdrawal.user_id,
        type: 'withdrawal_approved',
        title: 'Rút tiền thành công',
        message: `Yêu cầu rút tiền ${parseFloat(withdrawal.amount).toLocaleString('vi-VN')}đ của bạn đã được duyệt. Số tiền sẽ được chuyển vào tài khoản ngân hàng của bạn trong vòng 1-3 ngày làm việc.${admin_note ? `\nGhi chú: ${admin_note}` : ''}`,
        data: {
          transaction_id: id,
          amount: withdrawal.amount,
          new_balance: newBalance
        }
      });

      res.json({
        success: true,
        message: 'Withdrawal approved successfully',
        data: {
          transaction_id: id,
          amount: withdrawal.amount,
          user_id: withdrawal.user_id
        }
      });
    } catch (error) {
      console.error('Approve withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Reject withdrawal
  static async rejectWithdrawal(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.user_id;
      const { admin_note } = req.body;

      const withdrawal = await TransactionModel.findById(id);

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          message: 'Withdrawal not found'
        });
      }

      if (withdrawal.type !== 'withdraw') {
        return res.status(400).json({
          success: false,
          message: 'Invalid transaction type'
        });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending withdrawals can be rejected'
        });
      }

      // Update status to cancelled (rejected)
      await TransactionModel.updateStatus(id, 'cancelled');

      // Create notification for user
      await NotificationModel.create({
        user_id: withdrawal.user_id,
        type: 'withdrawal_rejected',
        title: 'Rút tiền bị từ chối',
        message: `Yêu cầu rút tiền ${parseFloat(withdrawal.amount).toLocaleString('vi-VN')}đ của bạn đã bị từ chối.${admin_note ? `\nLý do: ${admin_note}` : '\nVui lòng liên hệ admin để biết thêm chi tiết.'}`,
        data: {
          transaction_id: id,
          amount: withdrawal.amount
        }
      });

      res.json({
        success: true,
        message: 'Withdrawal rejected',
        data: {
          transaction_id: id
        }
      });
    } catch (error) {
      console.error('Reject withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get pending withdrawals count
  static async getPendingCount(req, res) {
    try {
      const db = require('../config/database');
      const [rows] = await db.execute(
        "SELECT COUNT(*) as count FROM transactions WHERE type = 'withdraw' AND status = 'pending'"
      );

      res.json({
        success: true,
        data: {
          pending_count: rows[0]?.count || 0
        }
      });
    } catch (error) {
      console.error('Get pending count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = AdminArtistController;

