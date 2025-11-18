const express = require('express');
const { body } = require('express-validator');
const UserController = require('../controllers/user.controller');
const { authenticateToken, isAdmin } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');
const { uploadAvatar } = require('../config/upload-cloudinary');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('full_name').optional().trim(),
  body('avatar_url').optional().isURL().withMessage('Invalid avatar URL')
];

const changePasswordValidation = [
  // Support both camelCase and snake_case
  body('currentPassword')
    .optional()
    .notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
  body('current_password')
    .optional()
    .notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),
  body('new_password')
    .optional()
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

// Routes
router.get('/profile/:id', authenticateToken, UserController.getProfile);
router.put('/profile', authenticateToken, updateProfileValidation, validate, UserController.updateProfile);
router.put('/change-password', authenticateToken, changePasswordValidation, validate, UserController.changePassword);
router.post('/upload-avatar', authenticateToken, uploadAvatar.single('avatar'), UserController.uploadAvatar);
router.get('/', authenticateToken, isAdmin, UserController.getAll);
router.delete('/:id', authenticateToken, isAdmin, UserController.delete);

module.exports = router;

