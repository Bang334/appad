const express = require('express');
const { body } = require('express-validator');
const CommentController = require('../controllers/comment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');

const router = express.Router();

// Validation rules
const createCommentValidation = [
  body('song_id').isInt().withMessage('Valid song_id is required'),
  body('content').trim().notEmpty().withMessage('Content is required')
];

const updateCommentValidation = [
  body('content').trim().notEmpty().withMessage('Content is required')
];

// Routes
router.get('/song/:songId', CommentController.getSongComments);
router.post('/', authenticateToken, createCommentValidation, validate, CommentController.create);
router.put('/:id', authenticateToken, updateCommentValidation, validate, CommentController.update);
router.delete('/:id', authenticateToken, CommentController.delete);

module.exports = router;

