const express = require('express');
const { body } = require('express-validator');
const GenreController = require('../controllers/genre.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');

const router = express.Router();

// Validation rules
const createGenreValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('description').optional().trim()
];

// Public routes
router.get('/', GenreController.getAll);
router.get('/with-count', GenreController.getAllWithSongCount);
router.get('/:id', GenreController.getById);

// Admin routes
router.post('/', authenticateToken, isAdmin, createGenreValidation, validate, GenreController.create);
router.put('/:id', authenticateToken, isAdmin, GenreController.update);
router.delete('/:id', authenticateToken, isAdmin, GenreController.delete);

module.exports = router;

