import api from '../config/api';

export const notificationService = {
  // Get user notifications
  getNotifications: async (limit = 50, offset = 0) => {
    const response = await api.get(`/notifications?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get unread count
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  // Get recent notifications
  getRecent: async (limit = 5) => {
    const response = await api.get(`/notifications/recent?limit=${limit}`);
    return response.data;
  },

  // Mark as read
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Mark all as read
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  // Delete all read notifications
  deleteAllRead: async () => {
    const response = await api.delete('/notifications/read-all');
    return response.data;
  },

  // Delete all notifications
  deleteAll: async () => {
    const response = await api.delete('/notifications/delete-all');
    return response.data;
  },
};

