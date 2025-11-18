const ArtistModel = require('../models/artist.model');

class ArtistController {
  // Get all artists
  static async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const artists = await ArtistModel.findAll(parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Get all artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const artist = await ArtistModel.getWithSongCount(id);
      
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        data: artist
      });
    } catch (error) {
      console.error('Get artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Search artists
  static async search(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const artists = await ArtistModel.search(q, parseInt(limit));
      
      res.json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Search artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create artist (Admin only)
  static async create(req, res) {
    try {
      const artistData = req.body;
      
      if (req.file) {
        artistData.image_url = `/uploads/images/${req.file.filename}`;
      }

      const artistId = await ArtistModel.create(artistData);
      
      res.status(201).json({
        success: true,
        message: 'Artist created successfully',
        data: { artist_id: artistId }
      });
    } catch (error) {
      console.error('Create artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update artist (Admin only)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const artistData = req.body;

      const updated = await ArtistModel.update(id, artistData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        message: 'Artist updated successfully'
      });
    } catch (error) {
      console.error('Update artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete artist (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await ArtistModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        message: 'Artist deleted successfully'
      });
    } catch (error) {
      console.error('Delete artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist albums
  static async getArtistAlbums(req, res) {
    try {
      const { id } = req.params;
      const db = require('../config/database');
      
      const [albums] = await db.query(
        `SELECT a.*, 
                COUNT(DISTINCT s.song_id) as song_count
         FROM albums a
         LEFT JOIN songs s ON a.album_id = s.album_id
         WHERE a.artist_id = ?
         GROUP BY a.album_id
         ORDER BY a.release_date DESC`,
        [id]
      );

      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Get artist albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist songs
  static async getArtistSongs(req, res) {
    try {
      const { id } = req.params;
      const db = require('../config/database');
      
      const [songs] = await db.query(
        `SELECT s.*, 
                a.name as artist_name,
                al.title as album_title,
                g.name as genre_name
         FROM songs s
         LEFT JOIN artists a ON s.artist_id = a.artist_id
         LEFT JOIN albums al ON s.album_id = al.album_id
         LEFT JOIN genres g ON s.genre_id = g.genre_id
         WHERE s.artist_id = ?
         ORDER BY s.release_date DESC`,
        [id]
      );

      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get artist songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ArtistController;

