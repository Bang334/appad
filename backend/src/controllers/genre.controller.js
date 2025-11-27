const GenreModel = require('../models/genre.model');

class GenreController {
  // Get all genres
  static async getAll(req, res) {
    try {
      const genres = await GenreModel.findAll();
      
      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      console.error('Get all genres error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all genres with song count
  static async getAllWithSongCount(req, res) {
    try {
      const genres = await GenreModel.findAllWithSongCount();
      
      res.json({
        success: true,
        data: genres
      });
    } catch (error) {
      console.error('Get all genres with song count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get genre by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const genre = await GenreModel.findById(id);
      
      if (!genre) {
        return res.status(404).json({
          success: false,
          message: 'Genre not found'
        });
      }

      res.json({
        success: true,
        data: genre
      });
    } catch (error) {
      console.error('Get genre error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create genre (Admin only)
  static async create(req, res) {
    try {
      const genreData = req.body;
      const genreId = await GenreModel.create(genreData);
      
      res.status(201).json({
        success: true,
        message: 'Genre created successfully',
        data: { genre_id: genreId }
      });
    } catch (error) {
      console.error('Create genre error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update genre (Admin only)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const genreData = req.body;

      const updated = await GenreModel.update(id, genreData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Genre not found'
        });
      }

      res.json({
        success: true,
        message: 'Genre updated successfully'
      });
    } catch (error) {
      console.error('Update genre error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete genre (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await GenreModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Genre not found'
        });
      }

      res.json({
        success: true,
        message: 'Genre deleted successfully'
      });
    } catch (error) {
      console.error('Delete genre error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = GenreController;

