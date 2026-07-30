import api from '../config/api';

export const premiumService = {
  // Subscribe to premium
  subscribe: async (durationDays = 30) => {
    const response = await api.post('/premium/subscribe', { duration_days: durationDays });
    return response.data;
  },

  // Check premium status
  checkStatus: async () => {
    const response = await api.get('/premium/status');
    return response.data;
  },

  // Cancel premium subscription
  cancel: async () => {
    const response = await api.post('/premium/cancel');
    return response.data;
  },

  // Purchase a song
  purchaseSong: async (songId) => {
    const response = await api.post('/premium/purchase', { song_id: songId });
    return response.data;
  },

  // Get purchased songs
  getPurchasedSongs: async () => {
    const response = await api.get('/premium/purchased-songs');
    return response.data;
  },

  // Get purchased albums
  getPurchasedAlbums: async () => {
    const response = await api.get('/premium/purchased-albums');
    return response.data;
  },

  // Get purchase history
  getPurchaseHistory: async (limit = 50, offset = 0) => {
    const response = await api.get(`/premium/purchase-history?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get total spent
  getTotalSpent: async () => {
    const response = await api.get('/premium/total-spent');
    return response.data;
  },

  // Check access to a specific song
  checkSongAccess: async (songId) => {
    const response = await api.get(`/premium/song/${songId}/access`);
    return response.data;
  },

  // Check access to many songs with one network request
  checkSongsAccess: async (songIds) => {
    const response = await api.post('/premium/songs/access', {
      song_ids: songIds,
    });
    return response.data;
  },

  // Purchase an album
  purchaseAlbum: async (albumId) => {
    const response = await api.post('/premium/purchase-album', { album_id: albumId });
    return response.data;
  },

  // Check access to a specific album
  checkAlbumAccess: async (albumId) => {
    const response = await api.get(`/premium/album/${albumId}/access`);
    return response.data;
  },

  // Get all premium songs
  getPremiumSongs: async (limit = 20, offset = 0) => {
    const response = await api.get(`/premium/songs?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get artist memberships (user's active memberships)
  getArtistMemberships: async () => {
    const response = await api.get('/premium/artist-memberships');
    return response.data;
  },

  // Get artist memberships history (all memberships including expired/cancelled)
  getArtistMembershipsHistory: async (limit = 50, offset = 0) => {
    const response = await api.get(`/premium/artist-memberships/history?limit=${limit}&offset=${offset}`);
    return response.data;
  },
};

