import api from '../config/api';

export const genreService = {
  // Get all genres
  getAllGenres: async () => {
    const response = await api.get('/genres');
    return response.data;
  },

  // Get all genres with song count
  getAllGenresWithSongCount: async () => {
    const response = await api.get('/genres/with-count');
    return response.data;
  },

  // Get genre by ID
  getGenreById: async (genreId) => {
    const response = await api.get(`/genres/${genreId}`);
    return response.data;
  },
};

