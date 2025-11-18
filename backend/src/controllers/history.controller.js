const HistoryModel = require('../models/history.model');

class HistoryController {
  // Get user listening history
  static async getUserHistory(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50 } = req.query;
      
      const history = await HistoryModel.getUserHistory(userId, parseInt(limit));
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get user history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get recently played songs
  static async getRecentlyPlayed(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 20 } = req.query;
      
      const songs = await HistoryModel.getRecentlyPlayed(userId, parseInt(limit));
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get recently played error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Clear user history
  static async clearHistory(req, res) {
    try {
      const userId = req.user.user_id;
      
      await HistoryModel.clearUserHistory(userId);
      
      res.json({
        success: true,
        message: 'History cleared successfully'
      });
    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = HistoryController;

