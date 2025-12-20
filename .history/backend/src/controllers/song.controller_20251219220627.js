const SongModel = require('../models/song.model');
const HistoryModel = require('../models/history.model');
const UserModel = require('../models/user.model');

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
      const { duration_listened = 0, is_completed = false } = req.body;

      console.log('🎵 [BACKEND] Play song request:', {
        song_id: id,
        user_id: userId,
        duration_listened,
        is_completed,
        actual_duration: req.body.actual_duration,
        body: req.body,
      });

      // Check if user has access to this song
      const accessInfo = await SongModel.checkAccess(id, userId);

      if (!accessInfo.hasAccess) {
        return res.status(403).json({
          success: false,
          message: accessInfo.reason || 'You do not have access to this song',
          song: accessInfo.song,
          requires_premium: true
        });
      }

      // Get song info for history
      const song = accessInfo.song;
      const isPremium = song.is_premium && accessInfo.accessType === 'premium' 
        ? await UserModel.isPremiumActive(userId) 
        : false;

      // Auto-update duration if frontend provides actual_duration from audio player
      // Only update if song doesn't have duration or duration is 0/null
      if (req.body.actual_duration) {
        const actualDurationSeconds = Math.round(req.body.actual_duration);
        
        // Normalize existing song duration to seconds for comparison
        let existingDurationSeconds = 0;
        if (song.duration) {
          // Duration could be in seconds (INT) or milliseconds
          // If > 10000, assume milliseconds (e.g. 180000ms = 3min)
          // If <= 10000, assume seconds (e.g. 180s = 3min)
          existingDurationSeconds = song.duration > 10000 
            ? Math.floor(song.duration / 1000) 
            : song.duration;
        }
        
        // Only update if song has no duration, duration is 0, or null
        const needsUpdate = !song.duration || existingDurationSeconds === 0 || existingDurationSeconds === null;
        
        if (needsUpdate && actualDurationSeconds > 0) {
          try {
            await SongModel.update(id, { duration: actualDurationSeconds });
            console.log(`✅ [BACKEND] Auto-updated song duration: ${id} -> ${actualDurationSeconds}s (was: ${existingDurationSeconds}s)`);
            // Update song object for later use
            song.duration = actualDurationSeconds;
          } catch (updateError) {
            console.error('⚠️ [BACKEND] Error auto-updating duration:', updateError);
            // Continue even if update fails
          }
        } else if (actualDurationSeconds > 0) {
          console.log(`ℹ️ [BACKEND] Song ${id} already has duration: ${existingDurationSeconds}s, skipping update`);
        }
      }

      // Calculate duration_listened and is_completed
      // Only use data from frontend, don't assume completed
      let calculatedDuration = 0;
      let calculatedCompleted = false;
      
      if (duration_listened > 0) {
        // Frontend sent duration data - use it
        calculatedDuration = duration_listened;
        calculatedCompleted = is_completed; // Only true if frontend says so
      } else if (song.duration && isPremium) {
        // For premium streams only: if no data from frontend, use song duration as fallback
        // song.duration could be in seconds (INT) or milliseconds
        // Check if it's > 10000 (likely seconds) or < 10000 (likely milliseconds)
        if (song.duration > 10000) {
          // Likely in seconds already
          calculatedDuration = song.duration;
        } else {
          // Likely in milliseconds, convert to seconds
          calculatedDuration = Math.floor(song.duration / 1000);
        }
        // DON'T assume completed - only frontend knows if user finished listening
        calculatedCompleted = false;
      }

      // Calculate listen percentage to determine if we should increment count
      // User must listen to > 50% of the song to count as a listen
      let shouldIncrementCount = false;
      if (song.duration > 0) {
         // Normalize song duration to seconds
         // If > 10000, assume milliseconds (e.g. 180000ms = 3min)
         // If <= 10000, assume seconds (e.g. 180s = 3min)
         const songDurationSec = song.duration > 10000 ? Math.floor(song.duration / 1000) : song.duration;
         
         if (songDurationSec > 0) {
             const percentage = calculatedDuration / songDurationSec;
             shouldIncrementCount = percentage >= 0.5;
         }
      }

      // Increment listen count (global song count) only if threshold met
      if (shouldIncrementCount) {
        await SongModel.incrementListenCount(id);
      }

      // Add to listening history (unified - handles both regular and premium)
      // Always add to history, but only increment user's listen count if threshold met
      await HistoryModel.add(userId, id, {
        artist_id: song.artist_id,
        duration_listened: calculatedDuration,
        is_completed: calculatedCompleted,
        is_premium_stream: isPremium,
        increment_count: shouldIncrementCount
      });

      res.json({
        success: true,
        message: 'Song played',
        access_type: accessInfo.accessType
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

