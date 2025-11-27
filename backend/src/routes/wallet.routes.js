const express = require('express');
const router = express.Router();
const WalletController = require('../controllers/wallet.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Get wallet balance
router.get('/balance', WalletController.getBalance);

// Create top-up request
router.post('/topup', WalletController.createTopUp);

// Confirm top-up (can be called by admin or webhook)
router.post('/confirm', WalletController.confirmTopUp);

// Get transaction history
router.get('/transactions', WalletController.getTransactions);

// Get pending transactions
router.get('/transactions/pending', WalletController.getPendingTransactions);

// Get wallet statistics
router.get('/statistics', WalletController.getStatistics);

// Cancel transaction
router.post('/transactions/:transaction_id/cancel', WalletController.cancelTransaction);

module.exports = router;

