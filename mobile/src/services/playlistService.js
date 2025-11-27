import api from '../config/api';

export const playlistService = {
  // Get user playlists
  getUserPlaylists: async () => {
    const response = await api.get('/playlists/my-playlists');
    return response.data;
  },

  // Get playlist by ID
  getPlaylistById: async (id) => {
    const response = await api.get(`/playlists/${id}`);
    return response.data;
  },

  // Create playlist
  createPlaylist: async (name, description) => {
    const response = await api.post('/playlists', { name, description });
    return response.data;
  },

  // Update playlist
  updatePlaylist: async (id, name, description) => {
    const response = await api.put(`/playlists/${id}`, { name, description });
    return response.data;
  },

  // Delete playlist
  deletePlaylist: async (id) => {
    const response = await api.delete(`/playlists/${id}`);
    return response.data;
  },

  // Add song to playlist
  addSongToPlaylist: async (playlistId, songId) => {
    const response = await api.post(`/playlists/${playlistId}/songs`, { song_id: songId });
    return response.data;
  },

  // Remove song from playlist
  removeSongFromPlaylist: async (playlistId, songId) => {
    const response = await api.delete(`/playlists/${playlistId}/songs/${songId}`);
    return response.data;
  },

  // Update song order in playlist
  updateSongOrder: async (playlistId, songOrders) => {
    const response = await api.put(`/playlists/${playlistId}/songs/order`, { songOrders });
    return response.data;
  },
};

