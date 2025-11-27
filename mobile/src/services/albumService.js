import api from '../config/api';

export const albumService = {
  // Get all albums
  getAllAlbums: async (limit = 50, offset = 0) => {
    const response = await api.get(`/albums?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get album by ID
  getAlbumById: async (id) => {
    const response = await api.get(`/albums/${id}`);
    return response.data;
  },

  // Get albums by artist
  getAlbumsByArtist: async (artistId) => {
    const response = await api.get(`/albums/artist/${artistId}`);
    return response.data;
  },
};
