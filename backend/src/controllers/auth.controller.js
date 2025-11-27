const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const ArtistModel = require('../models/artist.model');

class AuthController {
  // Register new user (normal user or artist)
  static async register(req, res) {
    try {
      const { username, email, password, full_name, artist_register, artist_bio, artist_country, artist_image_url } = req.body;

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

      const isArtistRegister = !!artist_register;

      const userId = await UserModel.create({
        username,
        email,
        password: hashedPassword,
        full_name,
        role: 'user',
        is_banned: isArtistRegister ? 2 : 0,
      });

      if (isArtistRegister) {
        try {
          await ArtistModel.create({
            name: full_name || username,
            bio: artist_bio || null,
            image_url: artist_image_url || null,
            country: artist_country || null,
            user_id: userId,
          });
        } catch (artistError) {
          console.error('Error creating artist profile during register:', artistError);
        }
      }

      // Generate token
      const token = jwt.sign(
        {
          user_id: userId,
          username,
          email,
          role: isArtistRegister ? 'artist' : 'user',
        },
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
        message: error.message || 'Server error',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

      // Check if banned
      if (user.is_banned === 1) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đã bị khóa'
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

      // Get artist_id if user is artist
      let artist_id = null;
      // Only treat as artist if not pending (is_banned !== 2)
      if (user.role === 'artist' && user.is_banned !== 2) {
        const ArtistModel = require('../models/artist.model');
        const artist = await ArtistModel.findByUserId(user.user_id);
        if (artist) {
          artist_id = artist.artist_id;
        }
      }

      // Determine effective role
      // If is_banned is 2 (pending artist), treat as user
      const effectiveRole = user.is_banned === 2 ? 'user' : user.role;

      // Generate token
      const token = jwt.sign(
        { 
          user_id: user.user_id, 
          username: user.username, 
          email: user.email, 
          role: effectiveRole, 
          artist_id 
        },
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
          background_video_url: user.background_video_url,
          role: effectiveRole,
          artist_id,
          token,
          is_pending_artist: user.is_banned === 2
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

      // Get artist_id if user is artist
      // Get artist_id if user is artist
      let artist_id = null;
      if (user.role === 'artist' && user.is_banned !== 2) {
        const ArtistModel = require('../models/artist.model');
        const artist = await ArtistModel.findByUserId(user.user_id);
        if (artist) {
          artist_id = artist.artist_id;
        }
      }

      const effectiveRole = user.is_banned === 2 ? 'user' : user.role;

      res.json({
        success: true,
        data: {
          ...user,
          role: effectiveRole,
          artist_id,
          is_pending_artist: user.is_banned === 2
        }
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

