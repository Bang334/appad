const express = require('express');
const { body } = require('express-validator');
const AlbumController = require('../controllers/album.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const upload = require('../config/upload');

const router = express.Router();

// Validation rules
const createAlbumValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('artist_id').optional().isInt(),
  body('release_date').optional().isDate()
];

// Public routes
router.get('/', AlbumController.getAll);
router.get('/:id', AlbumController.getById);
router.get('/artist/:artistId', AlbumController.getByArtist);

// Admin routes
router.post('/', authenticateToken, isAdmin, upload.single('cover'), createAlbumValidation, validate, AlbumController.create);
router.put('/:id', authenticateToken, isAdmin, AlbumController.update);
router.delete('/:id', authenticateToken, isAdmin, AlbumController.delete);

module.exports = router;

