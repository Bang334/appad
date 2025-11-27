const PlaylistModel = require('../models/playlist.model');

class PlaylistController {
  // Get all playlists (public)
  static async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const playlists = await PlaylistModel.findAll(parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: playlists
      });
    } catch (error) {
      console.error('Get all playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get user playlists
  static async getUserPlaylists(req, res) {
    try {
      const userId = req.user.user_id;
      const playlists = await PlaylistModel.findByUser(userId);
      
      res.json({
        success: true,
        data: playlists
      });
    } catch (error) {
      console.error('Get user playlists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get playlist by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const playlist = await PlaylistModel.findById(id);
      
      if (!playlist) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      const songs = await PlaylistModel.getSongs(id);
      
      res.json({
        success: true,
        data: {
          ...playlist,
          songs
        }
      });
    } catch (error) {
      console.error('Get playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create playlist
  static async create(req, res) {
    try {
      const { name, description } = req.body;
      const userId = req.user.user_id;

      const playlistId = await PlaylistModel.create({
        user_id: userId,
        name,
        description
      });
      
      res.status(201).json({
        success: true,
        message: 'Playlist created successfully',
        data: { playlist_id: playlistId }
      });
    } catch (error) {
      console.error('Create playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update playlist
  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;
      const { name, description } = req.body;

      // Check ownership
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this playlist'
        });
      }

      const updated = await PlaylistModel.update(id, { name, description });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      res.json({
        success: true,
        message: 'Playlist updated successfully'
      });
    } catch (error) {
      console.error('Update playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete playlist
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      // Check ownership
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this playlist'
        });
      }

      const deleted = await PlaylistModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Playlist not found'
        });
      }

      res.json({
        success: true,
        message: 'Playlist deleted successfully'
      });
    } catch (error) {
      console.error('Delete playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Add song to playlist
  static async addSong(req, res) {
    try {
      const { id } = req.params;
      const { song_id } = req.body;
      const userId = req.user.user_id;

      // Check ownership
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this playlist'
        });
      }

      const added = await PlaylistModel.addSong(id, song_id);
      
      if (!added) {
        return res.status(400).json({
          success: false,
          message: 'Song already in playlist'
        });
      }

      res.json({
        success: true,
        message: 'Song added to playlist'
      });
    } catch (error) {
      console.error('Add song to playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Remove song from playlist
  static async removeSong(req, res) {
    try {
      const { id, songId } = req.params;
      const userId = req.user.user_id;

      // Check ownership
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this playlist'
        });
      }

      const removed = await PlaylistModel.removeSong(id, songId);
      
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Song not found in playlist'
        });
      }

      res.json({
        success: true,
        message: 'Song removed from playlist'
      });
    } catch (error) {
      console.error('Remove song from playlist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update song order in playlist
  static async updateSongOrder(req, res) {
    try {
      const { id } = req.params;
      const { songOrders } = req.body; // Array of {song_id, order}
      const userId = req.user.user_id;

      // Check ownership
      const isOwner = await PlaylistModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to modify this playlist'
        });
      }

      if (!Array.isArray(songOrders) || songOrders.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid song orders'
        });
      }

      await PlaylistModel.updateSongOrder(id, songOrders);

      res.json({
        success: true,
        message: 'Song order updated successfully'
      });
    } catch (error) {
      console.error('Update song order error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = PlaylistController;

