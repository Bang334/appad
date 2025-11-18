const express = require('express');
const { body } = require('express-validator');
const SongController = require('../controllers/song.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const upload = require('../config/upload');

const router = express.Router();

// Validation rules
const createSongValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('duration').isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('artist_id').optional().isInt(),
  body('album_id').optional().isInt(),
  body('genre_id').optional().isInt()
];

// Public routes
router.get('/', SongController.getAll);
router.get('/search', SongController.search);
router.get('/trending', SongController.getTrending);
router.get('/:id', SongController.getById);
router.get('/genre/:genreId', SongController.getByGenre);
router.get('/artist/:artistId', SongController.getByArtist);
router.get('/album/:albumId', SongController.getByAlbum);

// Protected routes
router.post('/:id/play', authenticateToken, SongController.play);

// Admin routes
router.post('/', authenticateToken, isAdmin, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), createSongValidation, validate, SongController.create);
router.put('/:id', authenticateToken, isAdmin, SongController.update);
router.delete('/:id', authenticateToken, isAdmin, SongController.delete);

module.exports = router;

