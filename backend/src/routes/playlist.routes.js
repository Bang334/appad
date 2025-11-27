const express = require('express');
const { body } = require('express-validator');
const PlaylistController = require('../controllers/playlist.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');

const router = express.Router();

// Validation rules
const createPlaylistValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim()
];

const addSongValidation = [
  body('song_id').isInt().withMessage('Valid song_id is required')
];

// Routes
router.get('/', authenticateToken, PlaylistController.getAll);
router.get('/my-playlists', authenticateToken, PlaylistController.getUserPlaylists);
router.get('/:id', authenticateToken, PlaylistController.getById);
router.post('/', authenticateToken, createPlaylistValidation, validate, PlaylistController.create);
router.put('/:id', authenticateToken, PlaylistController.update);
router.delete('/:id', authenticateToken, PlaylistController.delete);
router.post('/:id/songs', authenticateToken, addSongValidation, validate, PlaylistController.addSong);
router.delete('/:id/songs/:songId', authenticateToken, PlaylistController.removeSong);
router.put('/:id/songs/order', authenticateToken, PlaylistController.updateSongOrder);

module.exports = router;

