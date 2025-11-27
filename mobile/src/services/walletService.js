import api from '../config/api';

export const walletService = {
  // Get wallet balance
  getBalance: async () => {
    const response = await api.get('/wallet/balance');
    return response.data;
  },

  // Create top-up request
  createTopUp: async (amount) => {
    const response = await api.post('/wallet/topup', { amount });
    return response.data;
  },

  // Confirm top-up
  confirmTopUp: async (transactionId, referenceCode) => {
    const response = await api.post('/wallet/confirm', {
      transaction_id: transactionId,
      reference_code: referenceCode,
    });
    return response.data;
  },

  // Get transaction history
  getTransactions: async (limit = 50, offset = 0) => {
    const response = await api.get(`/wallet/transactions?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get pending transactions
  getPendingTransactions: async () => {
    const response = await api.get('/wallet/transactions/pending');
    return response.data;
  },

  // Get wallet statistics
  getStatistics: async () => {
    const response = await api.get('/wallet/statistics');
    return response.data;
  },

  // Cancel transaction
  cancelTransaction: async (transactionId) => {
    const response = await api.post(`/wallet/transactions/${transactionId}/cancel`);
    return response.data;
  },
};

