const FollowModel = require('../models/follow.model');
const ArtistModel = require('../models/artist.model');
const NotificationModel = require('../models/notification.model');

class FollowController {
  // Follow an artist
  static async followArtist(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.body;

      // Check if artist exists
      const artist = await ArtistModel.findById(artist_id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      const success = await FollowModel.followArtist(userId, artist_id);

      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Already following this artist'
        });
      }

      // Create notification for artist (if artist has user_id)
      if (artist.user_id) {
        await NotificationModel.create({
          user_id: artist.user_id,
          type: 'new_follower',
          title: 'Người theo dõi mới',
          message: `${req.user.username} đã theo dõi bạn`,
          data: {
            follower_id: userId,
            follower_username: req.user.username,
            artist_id: artist_id
          }
        });
      }

      res.json({
        success: true,
        message: 'Successfully followed artist'
      });
    } catch (error) {
      console.error('Follow artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Unfollow an artist
  static async unfollowArtist(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.params;

      const success = await FollowModel.unfollowArtist(userId, artist_id);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Not following this artist'
        });
      }

      res.json({
        success: true,
        message: 'Successfully unfollowed artist'
      });
    } catch (error) {
      console.error('Unfollow artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Check if following
  static async checkFollowing(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.params;

      const isFollowing = await FollowModel.isFollowing(userId, artist_id);

      res.json({
        success: true,
        data: {
          is_following: isFollowing
        }
      });
    } catch (error) {
      console.error('Check following error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get user's followed artists
  static async getUserFollowedArtists(req, res) {
    try {
      const userId = req.user.user_id;
      const artists = await FollowModel.getUserFollowedArtists(userId);

      res.json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Get followed artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get user's followed artists with songs
  static async getFollowedArtistsWithSongs(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 3 } = req.query;
      const artists = await FollowModel.getFollowedArtistsWithSongs(userId, parseInt(limit));

      res.json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Get followed artists with songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist's followers
  static async getArtistFollowers(req, res) {
    try {
      const { artist_id } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      const followers = await FollowModel.getArtistFollowers(
        artist_id,
        limit,
        offset
      );

      const followerCount = await FollowModel.getFollowerCount(artist_id);

      res.json({
        success: true,
        data: {
          followers,
          follower_count: followerCount,
          total: followers.length
        }
      });
    } catch (error) {
      console.error('Get artist followers error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get follower count
  static async getFollowerCount(req, res) {
    try {
      const { artist_id } = req.params;
      const count = await FollowModel.getFollowerCount(artist_id);

      res.json({
        success: true,
        data: {
          follower_count: count
        }
      });
    } catch (error) {
      console.error('Get follower count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = FollowController;

