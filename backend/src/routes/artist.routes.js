const express = require('express');
const router = express.Router();
const ArtistController = require('../controllers/artist.controller');
const ArtistMembershipController = require('../controllers/artist-membership.controller');
const { authenticateToken, isArtistOwner } = require('../middleware/auth.middleware');
const upload = require('../config/upload');
const { uploadSong, uploadCover } = require('../config/upload-cloudinary');
// Public routes
router.get('/', ArtistController.getAll);
router.get('/:id', ArtistController.getById);
router.post('/:artist_id/upload-song', authenticateToken, isArtistOwner, uploadSong.single('song'), ArtistController.uploadSong);
router.post('/:artist_id/upload-cover', authenticateToken, isArtistOwner, uploadCover.single('cover'), ArtistController.uploadCover);
router.get('/:artist_id/dashboard', authenticateToken, isArtistOwner, ArtistController.getDashboard);
router.get('/:artist_id/balance', authenticateToken, isArtistOwner, ArtistController.getBalance);
router.get('/:artist_id/revenue', authenticateToken, isArtistOwner, ArtistController.getRevenueHistory);
router.get('/:artist_id/revenue/stats', authenticateToken, isArtistOwner, ArtistController.getRevenueStats);

// Withdrawal management
router.post('/:artist_id/withdraw', authenticateToken, isArtistOwner, ArtistController.requestWithdrawal);
router.get('/:artist_id/withdrawals', authenticateToken, isArtistOwner, ArtistController.getWithdrawals);

// Bank info
router.put('/:artist_id/bank-info', authenticateToken, isArtistOwner, ArtistController.updateBankInfo);

// Songs management
router.get('/:artist_id/songs', authenticateToken, isArtistOwner, ArtistController.getMySongs);
router.post('/:artist_id/songs', authenticateToken, isArtistOwner, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), ArtistController.createSong);
router.put('/:artist_id/songs/:song_id', authenticateToken, isArtistOwner, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), ArtistController.updateSong);
router.delete('/:artist_id/songs/:song_id', authenticateToken, isArtistOwner, ArtistController.deleteSong);

// Albums management
router.get('/:artist_id/albums', authenticateToken, isArtistOwner, ArtistController.getMyAlbums);
router.post('/:artist_id/albums', authenticateToken, isArtistOwner, uploadCover.fields([
  { name: 'cover', maxCount: 1 }
]), ArtistController.createAlbum);
router.put('/:artist_id/albums/:album_id', authenticateToken, isArtistOwner, uploadCover.fields([
  { name: 'cover', maxCount: 1 }
]), ArtistController.updateAlbum);
router.delete('/:artist_id/albums/:album_id', authenticateToken, isArtistOwner, ArtistController.deleteAlbum);

// Artist membership routes (public - users can subscribe)
router.post('/:artist_id/membership/subscribe', authenticateToken, ArtistMembershipController.subscribe);
router.get('/:artist_id/membership/status', authenticateToken, ArtistMembershipController.getStatus);
router.post('/:artist_id/membership/cancel', authenticateToken, ArtistMembershipController.cancel);

// Artist membership management (artist only)
router.get('/:artist_id/membership/members', authenticateToken, isArtistOwner, ArtistMembershipController.getMembers);
router.put('/:artist_id/membership/price', authenticateToken, isArtistOwner, ArtistMembershipController.updateMembershipPrice);

module.exports = router;
