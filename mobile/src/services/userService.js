import api from '../config/api';

export const userService = {
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

  // Update background video URL
  updateBackgroundVideo: async (videoUrl) => {
    const response = await api.put('/users/background-video', {
      background_video_url: videoUrl
    });
    return response.data;
  },

  // Register as artist
  registerArtist: async (data) => {
    const response = await api.post('/users/register-artist', data);
    return response.data;
  },
};
