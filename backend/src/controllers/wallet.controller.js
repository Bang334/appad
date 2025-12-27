const UserModel = require('../models/user.model');
const TransactionModel = require('../models/transaction.model');
const NotificationModel = require('../models/notification.model');
const crypto = require('crypto');

class WalletController {
  // Get wallet balance
  static async getBalance(req, res) {
    try {
      const userId = req.user.user_id;
      
      const walletInfo = await UserModel.getWalletInfo(userId);
      
      if (!walletInfo) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          balance: walletInfo.balance || 0,
          username: walletInfo.username,
          email: walletInfo.email
        }
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create top-up request with QR code info
  static async createTopUp(req, res) {
    try {
      const userId = req.user.user_id;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      // Generate unique reference code for this transaction
      const referenceCode = `MUSIC${userId}${Date.now()}`;

      // Create pending transaction
      const transactionId = await TransactionModel.create({
        user_id: userId,
        type: 'deposit',
        amount: parseFloat(amount),
        status: 'pending',
        description: `Nạp tiền vào ví`,
        reference_code: referenceCode
      });

      // VietComBank QR info
      const bankInfo = {
        bank_code: 'VCB',
        bank_name: 'VietComBank',
        account_number: '1029727303',
        account_name: 'NGUYEN SY KIM BANG',
        amount: parseFloat(amount),
        description: referenceCode,
        // VietComBank QR format
        qr_url: `https://img.vietqr.io/image/VCB-1029727303-compact2.png?amount=${amount}&addInfo=${referenceCode}&accountName=NGUYEN%20SY%20KIM%20BANG`
      };

      // Notify Admins
      try {
        const admins = await UserModel.findAdmins();
        if (admins.length > 0) {
          const adminIds = admins.map(a => a.user_id);
          const user = await UserModel.findById(userId);
          await NotificationModel.createBroadcast({
            user_ids: adminIds,
            type: 'system',
            title: 'Yêu cầu nạp tiền mới',
            message: `Người dùng ${user.username} vừa tạo yêu cầu nạp ${parseFloat(amount).toLocaleString('vi-VN')}đ. Mã lệnh: ${referenceCode}`,
            data: {
              transaction_id: transactionId,
              reference_code: referenceCode,
              amount: parseFloat(amount),
              user_id: userId,
              action: 'approve_deposit'
            }
          });
        }
      } catch (notifyError) {
        console.error('Notify admin deposit error:', notifyError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        message: 'Top-up request created',
        data: {
          transaction_id: transactionId,
          reference_code: referenceCode,
          amount: parseFloat(amount),
          bank_info: bankInfo
        }
      });
    } catch (error) {
      console.error('Create top-up error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Confirm top-up - DISABLED: Now only admin can approve via admin routes
  // This endpoint is disabled to require admin approval for all deposits
  static async confirmTopUp(req, res) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is disabled. All deposits require admin approval. Please contact admin.'
    });
  }

  // Get transaction history
  static async getTransactions(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0 } = req.query;

      const transactions = await TransactionModel.findByUser(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get pending transactions
  static async getPendingTransactions(req, res) {
    try {
      const userId = req.user.user_id;
      
      const transactions = await TransactionModel.getPendingTransactions(userId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Get pending transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get wallet statistics
  static async getStatistics(req, res) {
    try {
      const userId = req.user.user_id;
      
      const stats = await TransactionModel.getStatistics(userId);
      const balance = await UserModel.getBalance(userId);

      res.json({
        success: true,
        data: {
          current_balance: balance,
          ...stats
        }
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Cancel pending transaction
  static async cancelTransaction(req, res) {
    try {
      const userId = req.user.user_id;
      const { transaction_id } = req.params;

      const transaction = await TransactionModel.findById(transaction_id);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found'
        });
      }

      if (transaction.user_id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending transactions can be cancelled'
        });
      }

      await TransactionModel.updateStatus(transaction_id, 'cancelled');

      res.json({
        success: true,
        message: 'Transaction cancelled'
      });
    } catch (error) {
      console.error('Cancel transaction error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = WalletController;

