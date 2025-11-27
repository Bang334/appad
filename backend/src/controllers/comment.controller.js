const CommentModel = require('../models/comment.model');
const SongModel = require('../models/song.model');
const NotificationModel = require('../models/notification.model');
const ArtistModel = require('../models/artist.model');

class CommentController {
  // Get song comments and rating stats
  static async getSongComments(req, res) {
    try {
      const { songId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      const [comments, ratingStats] = await Promise.all([
        CommentModel.findBySong(songId, parseInt(limit), parseInt(offset)),
        CommentModel.getSongRatingStats(songId)
      ]);
      
      res.json({
        success: true,
        data: {
          comments,
          rating_stats: ratingStats
        }
      });
    } catch (error) {
      console.error('Get song comments error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create comment with rating
  static async create(req, res) {
    try {
      const { song_id, content, rating } = req.body;
      const userId = req.user.user_id;

      // Validate rating
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      // Check if user already commented
      const hasCommented = await CommentModel.hasUserCommented(userId, song_id);
      if (hasCommented) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã bình luận về bài hát này rồi'
        });
      }

      const commentId = await CommentModel.create({
        user_id: userId,
        song_id,
        content,
        rating
      });

      // Update song average rating
      if (rating) {
        await CommentController.updateSongAverageRating(song_id);
      }

      // Get song and artist info for notification
      const song = await SongModel.findById(song_id);
      if (song && song.artist_id) {
        const artist = await ArtistModel.findById(song.artist_id);
        
        // Notify artist about new comment/rating
        if (artist && artist.user_id) {
          const commenter = req.user; // User who created the comment
          const message = rating 
            ? `${commenter.username} đã đánh giá ${rating} sao cho bài hát "${song.title}"${content ? ' và để lại bình luận' : ''}`
            : `${commenter.username} đã bình luận về bài hát "${song.title}"`;
          
          await NotificationModel.create({
            user_id: artist.user_id,
            type: 'new_comment',
            title: rating ? 'Đánh giá mới' : 'Bình luận mới',
            message: message,
            data: {
              comment_id: commentId,
              song_id: song_id,
              song_title: song.title,
              artist_id: song.artist_id,
              commenter_id: userId,
              commenter_username: commenter.username,
              rating: rating || null,
              has_content: !!content
            }
          });
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Comment posted successfully',
        data: { comment_id: commentId }
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Helper function to update song average rating
  static async updateSongAverageRating(songId) {
    try {
      const stats = await CommentModel.getSongRatingStats(songId);
      const avgRating = stats.average_rating || 0;
      
      const db = require('../config/database');
      await db.execute(
        'UPDATE songs SET average_rating = ? WHERE song_id = ?',
        [avgRating, songId]
      );
    } catch (error) {
      console.error('Update average rating error:', error);
    }
  }

  // Update comment
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { content, rating } = req.body;
      const userId = req.user.user_id;

      // Validate rating
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      // Check ownership
      const isOwner = await CommentModel.isOwner(id, userId);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this comment'
        });
      }

      // Get original comment to check song_id
      const originalComment = await CommentModel.findById(id);
      
      const updated = await CommentModel.update(id, content, rating);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Update song average rating if rating changed
      if (rating && originalComment) {
        await CommentController.updateSongAverageRating(originalComment.song_id);
      }

      res.json({
        success: true,
        message: 'Comment updated successfully'
      });
    } catch (error) {
      console.error('Update comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete comment
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.user_id;

      // Get comment before deleting to update rating
      const comment = await CommentModel.findById(id);

      // Check ownership or admin
      const isOwner = await CommentModel.isOwner(id, userId);
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this comment'
        });
      }

      const deleted = await CommentModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Comment not found'
        });
      }

      // Update song average rating if comment had rating
      if (comment && comment.rating) {
        await CommentController.updateSongAverageRating(comment.song_id);
      }

      res.json({
        success: true,
        message: 'Comment deleted successfully'
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = CommentController;

