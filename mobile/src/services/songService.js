import api from '../config/api';

export const songService = {
  // Get all songs
  getAllSongs: async (limit = 20, offset = 0) => {
    const response = await api.get(`/songs?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get song by ID
  getSongById: async (id) => {
    const response = await api.get(`/songs/${id}`);
    return response.data;
  },

  // Search songs
  searchSongs: async (keyword) => {
    const response = await api.get(`/songs/search?q=${keyword}`);
    return response.data;
  },

  // Get trending songs
  getTrendingSongs: async (limit = 10) => {
    const response = await api.get(`/songs/trending?limit=${limit}`);
    return response.data;
  },

  // Get songs by genre
  getSongsByGenre: async (genreId) => {
    const response = await api.get(`/songs/genre/${genreId}`);
    return response.data;
  },

  // Get songs by artist
  getSongsByArtist: async (artistId) => {
    const response = await api.get(`/songs/artist/${artistId}`);
    return response.data;
  },

  // Get songs by album
  getSongsByAlbum: async (albumId) => {
    const response = await api.get(`/songs/album/${albumId}`);
    return response.data;
  },

  // Play song (update listen count and record duration/completion)
  playSong: async (songId, durationListened = null, isCompleted = null) => {
    const body = {};
    if (durationListened !== null) {
      body.duration_listened = durationListened;
    }
    if (isCompleted !== null) {
      body.is_completed = isCompleted;
    }
    const response = await api.post(`/songs/${songId}/play`, body);
    return response.data;
  },

  // Get all artists
  getArtists: async () => {
    const response = await api.get('/artists');
    return response.data;
  },

  // Get all albums
  getAlbums: async () => {
    const response = await api.get('/albums');
    return response.data;
  },

  // Get all genres
  getGenres: async () => {
    const response = await api.get('/genres');
    return response.data;
  },
};

