const express = require('express');
const router = express.Router();
const PremiumController = require('../controllers/premium.controller');
const ArtistMembershipController = require('../controllers/artist-membership.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticateToken);

// Premium subscription routes
router.post('/subscribe', PremiumController.subscribe);
router.get('/status', PremiumController.checkStatus);
router.post('/cancel', PremiumController.cancel);

// Song purchase routes
router.post('/purchase', PremiumController.purchaseSong);
router.post('/purchase-album', PremiumController.purchaseAlbum);
router.get('/purchased-songs', PremiumController.getPurchasedSongs);
router.get('/purchased-albums', PremiumController.getPurchasedAlbums);
router.get('/purchase-history', PremiumController.getPurchaseHistory);
router.get('/total-spent', PremiumController.getTotalSpent);

// Song access check
router.post('/songs/access', PremiumController.checkSongAccessBatch);
router.get('/song/:id/access', PremiumController.checkSongAccess);

// Get premium songs
router.get('/songs', PremiumController.getPremiumSongs);

// Artist membership routes (user's memberships)
router.get('/artist-memberships', ArtistMembershipController.getMyMemberships);
router.get('/artist-memberships/history', ArtistMembershipController.getMyMembershipsHistory);

module.exports = router;

