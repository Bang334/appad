import api from '../config/api';

export const commentService = {
  // Get song comments
  getSongComments: async (songId, limit = 50, offset = 0) => {
    const response = await api.get(`/comments/song/${songId}?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Create comment
  createComment: async (songId, content, rating) => {
    const response = await api.post('/comments', {
      song_id: songId,
      content,
      rating
    });
    return response.data;
  },

  // Update comment
  updateComment: async (commentId, content, rating) => {
    const response = await api.put(`/comments/${commentId}`, {
      content,
      rating
    });
    return response.data;
  },

  // Delete comment
  deleteComment: async (commentId) => {
    const response = await api.delete(`/comments/${commentId}`);
    return response.data;
  },
};

