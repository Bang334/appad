const express = require('express');
const router = express.Router();
const FollowController = require('../controllers/follow.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Follow an artist
router.post('/follow', FollowController.followArtist);

// Unfollow an artist
router.delete('/unfollow/:artist_id', FollowController.unfollowArtist);

// Check if following
router.get('/check/:artist_id', FollowController.checkFollowing);

// Get user's followed artists
router.get('/my-follows', FollowController.getUserFollowedArtists);

// Get user's followed artists with songs
router.get('/my-follows-with-songs', FollowController.getFollowedArtistsWithSongs);

// Get artist's followers
router.get('/artist/:artist_id/followers', FollowController.getArtistFollowers);

// Get follower count
router.get('/artist/:artist_id/follower-count', FollowController.getFollowerCount);

module.exports = router;

