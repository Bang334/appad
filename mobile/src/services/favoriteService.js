import api from '../config/api';

export const favoriteService = {
  // Get user favorites
  getUserFavorites: async () => {
    const response = await api.get('/favorites');
    return response.data;
  },

  // Add to favorites
  addFavorite: async (songId) => {
    const response = await api.post('/favorites', { song_id: songId });
    return response.data;
  },

  // Remove from favorites
  removeFavorite: async (songId) => {
    const response = await api.delete(`/favorites/${songId}`);
    return response.data;
  },

  // Check if song is favorited
  checkFavorite: async (songId) => {
    const response = await api.get(`/favorites/check/${songId}`);
    return response.data;
  },
};

