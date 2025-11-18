const express = require('express');
const { body } = require('express-validator');
const FavoriteController = require('../controllers/favorite.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');

const router = express.Router();

// Validation rules
const addFavoriteValidation = [
  body('song_id').isInt().withMessage('Valid song_id is required')
];

// Routes
router.get('/', authenticateToken, FavoriteController.getUserFavorites);
router.post('/', authenticateToken, addFavoriteValidation, validate, FavoriteController.add);
router.delete('/:songId', authenticateToken, FavoriteController.remove);
router.get('/check/:songId', authenticateToken, FavoriteController.check);

module.exports = router;

