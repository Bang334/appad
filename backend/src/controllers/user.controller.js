const UserModel = require('../models/user.model');
const bcrypt = require('bcryptjs');

class UserController {
  // Get user profile
  static async getProfile(req, res) {
    try {
      const { id } = req.params;
      const user = await UserModel.findById(id);
      
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
      console.error('Get user profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Upload avatar
  static async uploadAvatar(req, res) {
    try {
      const userId = req.user.user_id;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const avatar_url = req.file.path; // Cloudinary URL

      // Update user avatar
      const updated = await UserModel.update(userId, { avatar_url });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get updated user data
      const updatedUser = await UserModel.findById(userId);

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Upload avatar error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.user_id;
      const { username, email, full_name, avatar_url, background_video_url } = req.body;

      // Update user profile (bio is not in database schema, so we skip it)
      const updateData = {};
      if (username !== undefined) updateData.username = username;
      if (email !== undefined) updateData.email = email;
      if (full_name !== undefined) updateData.full_name = full_name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (background_video_url !== undefined) updateData.background_video_url = background_video_url;

      const updated = await UserModel.update(userId, updateData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Get updated user data
      const updatedUser = await UserModel.findById(userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update background video URL
  static async updateBackgroundVideo(req, res) {
    try {
      const userId = req.user.user_id;
      const { background_video_url } = req.body;

      // Validate YouTube URL format (optional)
      if (background_video_url && background_video_url.trim() !== '') {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/).+/;
        if (!youtubeRegex.test(background_video_url)) {
          return res.status(400).json({
            success: false,
            message: 'URL YouTube không hợp lệ'
          });
        }
      }

      const updated = await UserModel.update(userId, { 
        background_video_url: background_video_url || null 
      });
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Get updated user data
      const updatedUser = await UserModel.findById(userId);

      res.json({
        success: true,
        message: 'Cập nhật video background thành công',
        data: updatedUser
      });
    } catch (error) {
      console.error('Update background video error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const userId = req.user.user_id;
      // Support both camelCase and snake_case
      const currentPassword = req.body.currentPassword || req.body.current_password;
      const newPassword = req.body.newPassword || req.body.new_password;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập đầy đủ thông tin'
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
        });
      }

      // Get user with password
      const db = require('../config/database');
      const [users] = await db.execute(
        'SELECT * FROM users WHERE user_id = ?',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      const user = users[0];

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Mật khẩu hiện tại không đúng'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await UserModel.update(userId, { password: hashedPassword });

      res.json({
        success: true,
        message: 'Đổi mật khẩu thành công'
      });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }

  // Get all users (Admin only)
  static async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const users = await UserModel.findAll(parseInt(limit), parseInt(offset));
      
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete user (Admin only)
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await UserModel.delete(id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
  // Register as artist (for existing users)
  static async registerArtist(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_name, artist_bio, artist_image_url, artist_country } = req.body;
      const db = require('../config/database');

      // Check if user is already an artist or pending
      const [users] = await db.query('SELECT role, is_banned FROM users WHERE user_id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const user = users[0];
      if (user.role === 'artist') {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã là nghệ sĩ rồi'
        });
      }

      if (user.is_banned === 2) {
        return res.status(400).json({
          success: false,
          message: 'Yêu cầu của bạn đang chờ duyệt'
        });
      }

      // Check if artist record already exists (shouldn't happen if logic is correct, but good for safety)
      const [existingArtist] = await db.query('SELECT artist_id FROM artists WHERE user_id = ?', [userId]);
      if (existingArtist.length > 0) {
         // If record exists but user is not artist/pending, maybe something is wrong, but let's just update it
         await db.query(
           'UPDATE artists SET name = ?, bio = ?, image_url = ?, country = ? WHERE user_id = ?',
           [artist_name, artist_bio || null, artist_image_url || null, artist_country || null, userId]
         );
      } else {
        // Create artist record
        await db.query(
          'INSERT INTO artists (name, bio, image_url, country, user_id) VALUES (?, ?, ?, ?, ?)',
          [artist_name, artist_bio || null, artist_image_url || null, artist_country || null, userId]
        );
      }

      // Update user status to pending (is_banned = 2)
      await db.query('UPDATE users SET is_banned = 2 WHERE user_id = ?', [userId]);

      res.json({
        success: true,
        message: 'Đã gửi yêu cầu đăng ký nghệ sĩ. Vui lòng chờ admin duyệt.'
      });

    } catch (error) {
      console.error('Register artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi server'
      });
    }
  }
}

module.exports = UserController;

