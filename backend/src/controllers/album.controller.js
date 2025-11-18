const AlbumModel = require('../models/album.model');

class AlbumController {
  // Get all albums
  static async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const albums = await AlbumModel.findAll(parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Get all albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get album by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const album = await AlbumModel.findById(id);
      
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      const songs = await AlbumModel.getSongs(id);
      
      res.json({
        success: true,
        data: {
          ...album,
          songs
        }
      });
    } catch (error) {
      console.error('Get album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get albums by artist
  static async getByArtist(req, res) {
    try {
      const { artistId } = req.params;
      const albums = await AlbumModel.findByArtist(artistId);
      
      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Get albums by artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create album (Admin only)
  static async create(req, res) {
    try {
      const albumData = req.body;
      
      if (req.file) {
        albumData.cover_url = `/uploads/covers/${req.file.filename}`;
      }

      const albumId = await AlbumModel.create(albumData);
      
      res.status(201).json({
        success: true,
        message: 'Album created successfully',
        data: { album_id: albumId }
      });
    } catch (error) {
      console.error('Create album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update album (Admin only)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const albumData = req.body;

      const updated = await AlbumModel.update(id, albumData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      res.json({
        success: true,
        message: 'Album updated successfully'
      });
    } catch (error) {
      console.error('Update album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete album (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await AlbumModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      res.json({
        success: true,
        message: 'Album deleted successfully'
      });
    } catch (error) {
      console.error('Delete album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = AlbumController;

