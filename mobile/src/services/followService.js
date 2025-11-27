import api from '../config/api';

export const followService = {
  // Follow an artist
  followArtist: async (artistId) => {
    const response = await api.post('/follows/follow', { artist_id: artistId });
    return response.data;
  },

  // Unfollow an artist
  unfollowArtist: async (artistId) => {
    const response = await api.delete(`/follows/unfollow/${artistId}`);
    return response.data;
  },

  // Check if following
  checkFollowing: async (artistId) => {
    const response = await api.get(`/follows/check/${artistId}`);
    return response.data;
  },

  // Get user's followed artists
  getMyFollowedArtists: async () => {
    const response = await api.get('/follows/my-follows');
    return response.data;
  },

  // Get artist's followers
  getArtistFollowers: async (artistId, limit = 50, offset = 0) => {
    const response = await api.get(`/follows/artist/${artistId}/followers?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get follower count
  getFollowerCount: async (artistId) => {
    const response = await api.get(`/follows/artist/${artistId}/follower-count`);
    return response.data;
  },
};

