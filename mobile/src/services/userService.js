import api, { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const userService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Upload avatar - Dùng fetch thay vì axios để tránh bug FormData
  uploadAvatar: async (imageUri) => {
    console.log('📤 [uploadAvatar] Starting upload with FETCH...');
    console.log('   URI:', imageUri);
    
    const formData = new FormData();
    
    // Create file object from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    console.log('   Filename:', filename);
    console.log('   Type:', type);
    
    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type: type,
    });

    // Get token for authorization
    const token = await AsyncStorage.getItem('token');
    
    console.log('   Sending fetch request to:', `${API_BASE_URL}/users/upload-avatar`);
    
    // Retry logic để xử lý "cold start" network issue
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   Attempt ${attempt}/${maxRetries}...`);
        
        const response = await fetch(`${API_BASE_URL}/users/upload-avatar`, {
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
        console.log('✅ [uploadAvatar] Success!');
        return data;
        
      } catch (error) {
        console.log(`   ❌ Attempt ${attempt} failed:`, error.message);
        lastError = error;
        
        if (attempt < maxRetries) {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Recreate FormData for retry (important!)
          formData._parts = [];
          formData.append('avatar', {
            uri: imageUri,
            name: filename,
            type: type,
          });
        }
      }
    }
    
    // All retries failed
    throw lastError;
  },

  // Update user profile
  updateProfile: async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/users/change-password', passwordData);
    return response.data;
  },


  // Get user statistics
  getUserStats: async () => {
    const response = await api.get('/users/stats');
    return response.data;
  },

  // Get user playlists
  getUserPlaylists: async () => {
    const response = await api.get('/users/playlists');
    return response.data;
  },

  // Get user favorite songs
  getUserFavorites: async () => {
    const response = await api.get('/users/favorites');
    return response.data;
  },

  // Get user listening history
  getUserHistory: async (limit = 20, offset = 0) => {
    const response = await api.get(`/users/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Register as artist
  registerArtist: async (data) => {
    const response = await api.post('/users/register-artist', data);
    return response.data;
  },
};
