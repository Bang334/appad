const SongModel = require('../models/song.model');
const HistoryModel = require('../models/history.model');

class SongController {
  // Get all songs
  static async getAll(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const songs = await SongModel.findAll(parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: songs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Get all songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get song by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const song = await SongModel.findById(id);
      
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      res.json({
        success: true,
        data: song
      });
    } catch (error) {
      console.error('Get song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Search songs
  static async search(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      
      if (!q) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const songs = await SongModel.search(q, parseInt(limit));
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Search songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get trending songs
  static async getTrending(req, res) {
    try {
      const { limit = 10 } = req.query;
      const songs = await SongModel.getTrending(parseInt(limit));
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get trending songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get songs by genre
  static async getByGenre(req, res) {
    try {
      const { genreId } = req.params;
      const songs = await SongModel.findByGenre(genreId);
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get songs by genre error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get songs by artist
  static async getByArtist(req, res) {
    try {
      const { artistId } = req.params;
      const songs = await SongModel.findByArtist(artistId);
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get songs by artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get songs by album
  static async getByAlbum(req, res) {
    try {
      const { albumId } = req.params;
      const songs = await SongModel.findByAlbum(albumId);
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get songs by album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Play song (increment listen count and add to history)
  static async play(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      // Increment listen count
      await SongModel.incrementListenCount(id);

      // Add to listening history
      await HistoryModel.add(userId, id);

      res.json({
        success: true,
        message: 'Song played'
      });
    } catch (error) {
      console.error('Play song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create song (Admin only)
  static async create(req, res) {
    try {
      const songData = req.body;
      
      // Handle file uploads if present
      if (req.files) {
        if (req.files.audio) {
          songData.file_url = `/uploads/songs/${req.files.audio[0].filename}`;
        }
        if (req.files.cover) {
          songData.cover_url = `/uploads/covers/${req.files.cover[0].filename}`;
        }
      }

      const songId = await SongModel.create(songData);
      
      res.status(201).json({
        success: true,
        message: 'Song created successfully',
        data: { song_id: songId }
      });
    } catch (error) {
      console.error('Create song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update song (Admin only)
  static async update(req, res) {
    try {
      const { id } = req.params;
      const songData = req.body;

      const updated = await SongModel.update(id, songData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      res.json({
        success: true,
        message: 'Song updated successfully'
      });
    } catch (error) {
      console.error('Update song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete song (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await SongModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      res.json({
        success: true,
        message: 'Song deleted successfully'
      });
    } catch (error) {
      console.error('Delete song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = SongController;

