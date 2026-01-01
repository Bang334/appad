import api, { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  searchUsers: async (query) => {
    const response = await api.get(`/admin/users/search?q=${query}`);
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

  createAlbum: async (albumData, files = null) => {
    // Nếu không có file, dùng axios bình thường (JSON)
    if (!files || !files.cover) {
      const response = await api.post('/admin/albums', albumData);
      return response.data;
    }

    // Có file -> dùng fetch với retry
    console.log('📤 [createAlbum] Starting upload with FETCH...');
    
    const token = await AsyncStorage.getItem('token');
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        const formData = new FormData();
        Object.keys(albumData).forEach(key => {
          if (albumData[key] !== null && albumData[key] !== undefined) {
            formData.append(key, albumData[key].toString());
          }
        });
        formData.append('cover', {
          uri: files.cover.uri,
          type: files.cover.type || 'image/jpeg',
          name: files.cover.name || 'cover.jpg',
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/albums`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Connection': 'close',
          },
          body: formData,
          cache: 'no-store',
        });
        
        console.log('   Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const data = await response.json();
        console.log('✅ [createAlbum] Success!');
        return data;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw lastError;
  },

  updateAlbum: async (albumId, albumData, files = null) => {
    // Nếu không có file, dùng axios bình thường (JSON)
    if (!files || !files.cover) {
      console.log(`📤 [updateAlbum] Updating album ${albumId} (JSON)`);
      const response = await api.put(`/admin/albums/${albumId}`, albumData);
      return response.data;
    }

    // Có file -> dùng fetch với retry
    console.log(`📤 [updateAlbum] Starting upload with FETCH for album ${albumId}...`);
    
    const token = await AsyncStorage.getItem('token');
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        const formData = new FormData();
        Object.keys(albumData).forEach(key => {
          if (albumData[key] !== null && albumData[key] !== undefined) {
            formData.append(key, albumData[key].toString());
          }
        });
        formData.append('cover', {
          uri: files.cover.uri,
          type: files.cover.type || 'image/jpeg',
          name: files.cover.name || 'cover.jpg',
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/albums/${albumId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Connection': 'close',
          },
          body: formData,
          cache: 'no-store',
        });
        
        console.log('   Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const data = await response.json();
        console.log('✅ [updateAlbum] Success!');
        return data;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw lastError;
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

  getArtistReviews: async (artistId, params = {}) => {
    const { limit = 50, offset = 0, song_id, rating, sort_by } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(song_id && { song_id }),
      ...(rating && { rating }),
      ...(sort_by && { sort_by }),
    }).toString();
    const response = await api.get(`/admin/artists/${artistId}/reviews?${queryParams}`);
    return response.data;
  },

  getAllReviews: async (params = {}) => {
    const { limit = 50, offset = 0, artist_id, rating, sort_by } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(artist_id && { artist_id }),
      ...(rating && { rating }),
      ...(sort_by && { sort_by }),
    }).toString();
    const response = await api.get(`/admin/reviews?${queryParams}`);
    return response.data;
  },

  getReviewStats: async () => {
    const response = await api.get('/admin/reviews/stats');
    return response.data;
  },

  getArtistSongs: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/songs`);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`/admin/reviews/${reviewId}`);
    return response.data;
  },

  // Removed duplicate createAlbum


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

  // Upload files - Dùng fetch với retry để tránh network issues
  uploadSong: async (fileUri) => {
    console.log('📤 [adminService.uploadSong] Starting upload with FETCH...');
    
    const fileName = fileUri.split('/').pop() || 'song.mp3';
    console.log('   File:', fileName);
    
    const token = await AsyncStorage.getItem('token');
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        const formData = new FormData();
        formData.append('song', {
          uri: fileUri,
          type: 'audio/mpeg',
          name: fileName,
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/upload-song`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Connection': 'close',
          },
          body: formData,
          cache: 'no-store',
        });
        
        console.log('   Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const data = await response.json();
        console.log('✅ [adminService.uploadSong] Success!');
        return data;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw lastError;
  },

  uploadCover: async (fileUri) => {
    console.log('📤 [adminService.uploadCover] Starting upload with FETCH...');
    
    const fileName = fileUri.split('/').pop() || 'cover.jpg';
    console.log('   File:', fileName);
    
    const token = await AsyncStorage.getItem('token');
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        const formData = new FormData();
        formData.append('cover', {
          uri: fileUri,
          type: 'image/jpeg',
          name: fileName,
        });
        
        const response = await fetch(`${API_BASE_URL}/admin/upload-cover`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Connection': 'close',
          },
          body: formData,
          cache: 'no-store',
        });
        
        console.log('   Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const data = await response.json();
        console.log('✅ [adminService.uploadCover] Success!');
        return data;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    throw lastError;
  },

  // Artist Withdrawal Management
  getAllWithdrawals: async (params = {}) => {
    const { status, limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(status && { status }),
    }).toString();
    const response = await api.get(`/admin/withdrawals?${queryParams}`);
    return response.data;
  },

  getPendingWithdrawalsCount: async () => {
    const response = await api.get('/admin/withdrawals/pending-count');
    return response.data;
  },

  approveWithdrawal: async (withdrawalId, adminNote = '') => {
    const response = await api.post(`/admin/withdrawals/${withdrawalId}/approve`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  rejectWithdrawal: async (withdrawalId, adminNote) => {
    const response = await api.post(`/admin/withdrawals/${withdrawalId}/reject`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  // Transaction Management (Deposit approvals)
  getAllTransactions: async (params = {}) => {
    const { type, status, user_id, limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(type && { type }),
      ...(status && { status }),
      ...(user_id && { user_id }),
    }).toString();
    const response = await api.get(`/admin/transactions?${queryParams}`);
    return response.data;
  },

  getPendingDeposits: async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
    }).toString();
    const response = await api.get(`/admin/transactions/pending-deposits?${queryParams}`);
    return response.data;
  },

  getPendingDepositsCount: async () => {
    const response = await api.get('/admin/transactions/pending-deposits/count');
    return response.data;
  },

  approveDeposit: async (transactionId, adminNote = '') => {
    const response = await api.post(`/admin/transactions/${transactionId}/approve`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  rejectDeposit: async (transactionId, adminNote) => {
    const response = await api.post(`/admin/transactions/${transactionId}/reject`, {
      admin_note: adminNote,
    });
    return response.data;
  },

  // System Notifications
  createSystemNotification: async (title, message, user_ids = null, data = null) => {
    const response = await api.post('/admin/notifications/system', {
      title,
      message,
      user_ids,
      data
    });
    return response.data;
  },

  // Artist Membership Management
  getAllMemberships: async (params = {}) => {
    const { limit = 50, offset = 0, artist_id, status, search } = params;
    const queryParams = new URLSearchParams({
      limit,
      offset,
      ...(artist_id && { artist_id }),
      ...(status && { status }),
      ...(search && { search }),
    }).toString();
    const response = await api.get(`/admin/memberships?${queryParams}`);
    return response.data;
  },

  getMembershipStats: async () => {
    const response = await api.get('/admin/memberships/stats');
    return response.data;
  },

  // Premium Revenue & Payout
  calculatePremiumPayout: async (startDate, endDate) => {
    const response = await api.post('/revenue/calculate-monthly', {
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  applyPremiumPayout: async (payoutData) => {
    const response = await api.post('/revenue/apply-monthly', payoutData);
    return response.data;
  },

  getPayoutHistory: async () => {
    const response = await api.get('/revenue/payout-history');
    return response.data;
  },

  getPayoutBatchDetails: async (batchTime) => {
    const response = await api.get(`/revenue/payout-batch?batch_time=${encodeURIComponent(batchTime)}`);
    return response.data;
  },
};
