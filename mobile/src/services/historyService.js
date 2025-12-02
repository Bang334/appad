import api from '../config/api';

export const historyService = {
  // Get user listening history
  getUserHistory: async (limit = 50) => {
    const response = await api.get(`/history?limit=${limit}`);
    return response.data;
  },

  // Get user listening history grouped by day
  getUserHistoryByDay: async (limit = 100, offset = 0) => {
    const response = await api.get(`/history/by-day?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get recently played songs
  getRecentlyPlayed: async (limit = 20) => {
    const response = await api.get(`/history/recently-played?limit=${limit}`);
    return response.data;
  },

  // Clear user history
  clearHistory: async () => {
    const response = await api.delete('/history/clear');
    return response.data;
  },
};

