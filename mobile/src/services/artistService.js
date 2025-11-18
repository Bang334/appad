import api from '../config/api';

export const artistService = {
  // Get all artists
  getAllArtists: async (limit = 50, offset = 0) => {
    const response = await api.get(`/artists?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get artist by ID
  getArtistById: async (id) => {
    const response = await api.get(`/artists/${id}`);
    return response.data;
  },

  // Search artists
  searchArtists: async (keyword) => {
    const response = await api.get(`/artists/search?q=${keyword}`);
    return response.data;
  },

  // Get artist albums
  getArtistAlbums: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/albums`);
    return response.data;
  },

  // Get artist songs
  getArtistSongs: async (artistId) => {
    const response = await api.get(`/artists/${artistId}/songs`);
    return response.data;
  },
};

