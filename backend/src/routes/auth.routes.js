const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const validate = require('../middleware/validator.middleware');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').optional().trim(),
  // artist_register là boolean optional; nếu true sẽ đăng ký tài khoản nghệ sĩ (chờ duyệt)
  body('artist_register').optional().isBoolean().withMessage('artist_register must be boolean'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required')
];

const changePasswordValidation = [
  body('old_password').notEmpty().withMessage('Old password is required'),
  body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
];

// Routes
router.post('/register', registerValidation, validate, AuthController.register);
router.post('/login', loginValidation, validate, AuthController.login);
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.put('/change-password', authenticateToken, changePasswordValidation, validate, AuthController.changePassword);

module.exports = router;

