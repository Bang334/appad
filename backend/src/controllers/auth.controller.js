const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { username, email, password, full_name } = req.body;

      // Check if user exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      const existingUsername = await UserModel.findByUsername(username);
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        full_name
      });

      // Generate token
      const token = jwt.sign(
        { user_id: userId, username, email, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user_id: userId,
          username,
          email,
          full_name,
          token
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate token
      const token = jwt.sign(
        { user_id: user.user_id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          role: user.role,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get current user
  static async getCurrentUser(req, res) {
    try {
      const user = await UserModel.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const { old_password, new_password } = req.body;
      const userId = req.user.user_id;

      const user = await UserModel.findById(userId);
      const isMatch = await bcrypt.compare(old_password, user.password);
      
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: 'Incorrect old password'
        });
      }

      const hashedPassword = await bcrypt.hash(new_password, 10);
      await UserModel.update(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = AuthController;

