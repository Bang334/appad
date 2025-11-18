import api from '../config/api';

export const adminService = {
  // Dashboard
  getDashboardStats: async () => {
    const response = await api.get('/admin/dashboard/stats');
    return response.data;
  },

  // User Management
  getAllUsers: async (limit = 20, offset = 0, search = '') => {
    const response = await api.get(`/admin/users?limit=${limit}&offset=${offset}&search=${search}`);
    return response.data;
  },

  getUserById: async (userId) => {
    const response = await api.get(`/admin/users/${userId}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/admin/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  banUser: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/ban`);
    return response.data;
  },

  unbanUser: async (userId) => {
    const response = await api.put(`/admin/users/${userId}/unban`);
    return response.data;
  },

  // Song Management
  getAllSongs: async (limit = 20, offset = 0, search = '') => {
    const response = await api.get(`/admin/songs?limit=${limit}&offset=${offset}&search=${search}`);
    return response.data;
  },

  getSongById: async (songId) => {
    const response = await api.get(`/admin/songs/${songId}`);
    return response.data;
  },

  createSong: async (songData) => {
    const response = await api.post('/admin/songs', songData);
    return response.data;
  },

  updateSong: async (songId, songData) => {
    const response = await api.put(`/admin/songs/${songId}`, songData);
    return response.data;
  },

  deleteSong: async (songId) => {
    const response = await api.delete(`/admin/songs/${songId}`);
    return response.data;
  },

  // Album Management
  getAllAlbums: async (limit = 20, offset = 0) => {
    const response = await api.get(`/admin/albums?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  createAlbum: async (albumData) => {
    const response = await api.post('/admin/albums', albumData);
    return response.data;
  },

  updateAlbum: async (albumId, albumData) => {
    const response = await api.put(`/admin/albums/${albumId}`, albumData);
    return response.data;
  },

  deleteAlbum: async (albumId) => {
    const response = await api.delete(`/admin/albums/${albumId}`);
    return response.data;
  },

  // Analytics
  getAnalytics: async (period = '30d') => {
    const response = await api.get(`/admin/analytics?period=${period}`);
    return response.data;
  },

  // Create new entities
  createArtist: async (artistData) => {
    const response = await api.post('/admin/artists', artistData);
    return response.data;
  },

  createAlbum: async (albumData) => {
    const response = await api.post('/admin/albums', albumData);
    return response.data;
  },

  createGenre: async (genreData) => {
    const response = await api.post('/admin/genres', genreData);
    return response.data;
  },

  getUserAnalytics: async () => {
    const response = await api.get('/admin/analytics/users');
    return response.data;
  },

  getSongAnalytics: async () => {
    const response = await api.get('/admin/analytics/songs');
    return response.data;
  },

  // System Management
  getSystemSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },

  updateSystemSettings: async (settings) => {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },

  // Backup & Restore
  createBackup: async () => {
    const response = await api.post('/admin/backup');
    return response.data;
  },

  restoreBackup: async (backupId) => {
    const response = await api.post(`/admin/restore/${backupId}`);
    return response.data;
  },

  getBackups: async () => {
    const response = await api.get('/admin/backups');
    return response.data;
  },

  // Upload files
  uploadSong: async (fileUri) => {
    try {
      const uriParts = fileUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'song.mp3';
      
      const formData = new FormData();
      formData.append('song', {
        uri: fileUri,
        type: 'audio/mpeg',
        name: fileName,
      });
      
      const response = await api.post('/admin/upload-song', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload song error:', error.message);
      throw error;
    }
  },

  uploadCover: async (fileUri) => {
    try {
      const uriParts = fileUri.split('/');
      const fileName = uriParts[uriParts.length - 1] || 'cover.jpg';
      
      const formData = new FormData();
      formData.append('cover', {
        uri: fileUri,
        type: 'image/jpeg',
        name: fileName,
      });
      
      const response = await api.post('/admin/upload-cover', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds timeout
      });
      
      return response.data;
    } catch (error) {
      console.error('Upload cover error:', error.message);
      throw error;
    }
  },
};
