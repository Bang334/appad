import api from '../config/api';

export const userService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Upload avatar
  uploadAvatar: async (imageUri) => {
    const formData = new FormData();
    
    // Create file object from URI
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('avatar', {
      uri: imageUri,
      name: filename,
      type: type,
    });

    const response = await api.post('/users/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
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
};
