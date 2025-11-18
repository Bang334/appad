const express = require('express');
const AdminController = require('../controllers/admin.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const { uploadSong, uploadCover } = require('../config/upload-cloudinary');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(isAdmin);

// Dashboard stats
router.get('/dashboard/stats', AdminController.getDashboardStats);

// User management
router.get('/users', AdminController.getAllUsers);
router.get('/users/:id', AdminController.getUserById);
router.put('/users/:id/ban', AdminController.banUser);
router.put('/users/:id/unban', AdminController.unbanUser);
router.delete('/users/:id', AdminController.deleteUser);

// Song management
router.get('/songs', AdminController.getAllSongs);
router.get('/songs/:id', AdminController.getSongById);
router.post('/songs', AdminController.createSong);
router.put('/songs/:id', AdminController.updateSong);
router.delete('/songs/:id', AdminController.deleteSong);

// Upload song file with error handling
router.post('/upload-song', (req, res, next) => {
  uploadSong.single('song')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi upload file: ' + err.message
      });
    }
    next();
  });
}, AdminController.uploadSong);

router.post('/upload-cover', (req, res, next) => {
  uploadCover.single('cover')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'Lỗi upload ảnh: ' + err.message
      });
    }
    next();
  });
}, AdminController.uploadCover);

// Artist management
router.post('/artists', AdminController.createArtist);

// Album management
router.get('/albums', AdminController.getAllAlbums);
router.post('/albums', AdminController.createAlbum);
router.put('/albums/:id', AdminController.updateAlbum);
router.delete('/albums/:id', AdminController.deleteAlbum);

// Genre management
router.post('/genres', AdminController.createGenre);

// Analytics
router.get('/analytics', AdminController.getAnalytics);
router.get('/analytics/users', AdminController.getUserAnalytics);
router.get('/analytics/songs', AdminController.getSongAnalytics);

module.exports = router;
