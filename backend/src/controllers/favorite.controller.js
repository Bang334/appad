const FavoriteModel = require('../models/favorite.model');

class FavoriteController {
  // Get user favorites
  static async getUserFavorites(req, res) {
    try {
      const userId = req.user.user_id;
      const favorites = await FavoriteModel.getUserFavorites(userId);
      
      res.json({
        success: true,
        data: favorites
      });
    } catch (error) {
      console.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Add to favorites
  static async add(req, res) {
    try {
      const { song_id } = req.body;
      const userId = req.user.user_id;

      const added = await FavoriteModel.add(userId, song_id);
      
      if (!added) {
        return res.status(400).json({
          success: false,
          message: 'Song already in favorites'
        });
      }

      res.json({
        success: true,
        message: 'Song added to favorites'
      });
    } catch (error) {
      console.error('Add to favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Remove from favorites
  static async remove(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.user_id;

      const removed = await FavoriteModel.remove(userId, songId);
      
      if (!removed) {
        return res.status(404).json({
          success: false,
          message: 'Song not found in favorites'
        });
      }

      res.json({
        success: true,
        message: 'Song removed from favorites'
      });
    } catch (error) {
      console.error('Remove from favorites error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Check if song is favorited
  static async check(req, res) {
    try {
      const { songId } = req.params;
      const userId = req.user.user_id;

      const isFavorite = await FavoriteModel.isFavorite(userId, songId);
      
      res.json({
        success: true,
        data: { isFavorite: isFavorite }
      });
    } catch (error) {
      console.error('Check favorite error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = FavoriteController;

