const express = require('express');
const { body } = require('express-validator');
const ArtistController = require('../controllers/artist.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const upload = require('../config/upload');

const router = express.Router();

// Validation rules
const createArtistValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('bio').optional().trim(),
  body('country').optional().trim()
];

// Public routes
router.get('/', ArtistController.getAll);
router.get('/search', ArtistController.search);
router.get('/:id', ArtistController.getById);
router.get('/:id/albums', ArtistController.getArtistAlbums);
router.get('/:id/songs', ArtistController.getArtistSongs);

// Admin routes
router.post('/', authenticateToken, isAdmin, upload.single('image'), createArtistValidation, validate, ArtistController.create);
router.put('/:id', authenticateToken, isAdmin, ArtistController.update);
router.delete('/:id', authenticateToken, isAdmin, ArtistController.delete);

module.exports = router;

