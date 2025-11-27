const db = require('../config/database');
const ArtistMembershipModel = require('../models/artist-membership.model');
const ArtistModel = require('../models/artist.model');

class AdminController {
  // Dashboard stats
  async getDashboardStats(req, res) {
    try {
      // Get total users
      const [usersResult] = await db.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = usersResult[0].total;

      // Get total songs
      const [songsResult] = await db.query('SELECT COUNT(*) as total FROM songs');
      const totalSongs = songsResult[0].total;

      // Get total plays
      const [playsResult] = await db.query('SELECT SUM(listen_count) as total FROM songs');
      const totalPlays = playsResult[0].total || 0;

      // Get new users this month
      const [newUsersResult] = await db.query(
        'SELECT COUNT(*) as total FROM users WHERE MONTH(created_at) = MONTH(CURRENT_DATE()) AND YEAR(created_at) = YEAR(CURRENT_DATE())'
      );
      const newUsersThisMonth = newUsersResult[0].total;

      res.json({
        success: true,
        data: {
          totalUsers,
          totalSongs,
          totalPlays,
          newUsersThisMonth
        }
      });
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê'
      });
    }
  }

  // User management
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let query = `
        SELECT 
          u.user_id, 
          u.username, 
          u.email, 
          u.role, 
          u.is_banned, 
          u.avatar_url, 
          u.created_at,
          a.artist_id,
          a.name as artist_name
        FROM users u
        LEFT JOIN artists a ON u.user_id = a.user_id
      `;
      let params = [];

      if (search) {
        query += ' WHERE (u.username LIKE ? OR u.email LIKE ?)';
        params = [`%${search}%`, `%${search}%`];
      }

      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [users] = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users u';
      if (search) {
        countQuery += ' WHERE (u.username LIKE ? OR u.email LIKE ?)';
      }
      const [countResult] = await db.query(
        countQuery,
        search ? [`%${search}%`, `%${search}%`] : []
      );

      res.json({
        success: true,
        data: users,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách người dùng'
      });
    }
  }

  async searchUsers(req, res) {
    try {
      const { q } = req.query;
      
      if (!q) {
        return res.json({
          success: true,
          data: []
        });
      }

      // Search by ID, username, email or full_name (if exists)
      // Using simple LIKE query for now
      const query = `
        SELECT 
          user_id, 
          username, 
          email, 
          avatar_url,
          full_name
        FROM users 
        WHERE 
          user_id = ? OR
          username LIKE ? OR 
          email LIKE ? OR
          full_name LIKE ?
        LIMIT 20
      `;
      
      const searchPattern = `%${q}%`;
      const [users] = await db.query(query, [q, searchPattern, searchPattern, searchPattern]);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error searching users:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tìm kiếm người dùng'
      });
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const [users] = await db.query(
        'SELECT user_id, username, email, role, is_banned, avatar_url, created_at FROM users WHERE user_id = ?',
        [id]
      );

      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      res.json({
        success: true,
        data: users[0]
      });
    } catch (error) {
      console.error('Error getting user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin người dùng'
      });
    }
  }

  async banUser(req, res) {
    try {
      const { id } = req.params;

      // Check current status
      const [users] = await db.query('SELECT is_banned FROM users WHERE user_id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }
      
      const currentStatus = users[0].is_banned;

      // Nếu user đang ở trạng thái chờ duyệt nghệ sĩ (is_banned = 2) và bị "ban" (từ chối),
      // xóa hồ sơ artist nhưng GIỮ LẠI tài khoản user (về trạng thái bình thường is_banned = 0).
      if (currentStatus === 2) {
        await db.query('DELETE FROM artists WHERE user_id = ?', [id]);
        await db.query('UPDATE users SET is_banned = 0 WHERE user_id = ?', [id]);
        return res.json({
          success: true,
          message: 'Đã từ chối yêu cầu nghệ sĩ'
        });
      }

      // Nếu user bình thường, chỉ ban (is_banned = 1)
      await db.query('UPDATE users SET is_banned = 1 WHERE user_id = ?', [id]);

      res.json({
        success: true,
        message: 'Đã cấm người dùng'
      });
    } catch (error) {
      console.error('Error banning user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cấm người dùng'
      });
    }
  }

  async unbanUser(req, res) {
    try {
      const { id } = req.params;

      // Check current status
      const [users] = await db.query('SELECT is_banned FROM users WHERE user_id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      const currentStatus = users[0].is_banned;

      // Nếu đang chờ duyệt (is_banned = 2), chấp nhận -> set role = artist, is_banned = 0
      if (currentStatus === 2) {
        await db.query('UPDATE users SET is_banned = 0, role = "artist" WHERE user_id = ?', [id]);
        return res.json({
          success: true,
          message: 'Đã chấp nhận yêu cầu nghệ sĩ'
        });
      }

      // Nếu đang bị ban (is_banned = 1), mở lại -> set is_banned = 0
      await db.query('UPDATE users SET is_banned = 0 WHERE user_id = ?', [id]);

      res.json({
        success: true,
        message: 'Đã bỏ cấm người dùng'
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi bỏ cấm người dùng'
      });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Check if user exists
      const [users] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [id]);
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy người dùng'
        });
      }

      // Delete user (cascade will handle related records)
      await db.query('DELETE FROM users WHERE user_id = ?', [id]);

      res.json({
        success: true,
        message: 'Đã xóa người dùng'
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa người dùng'
      });
    }
  }

  // Song management
  async getAllSongs(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';

      let query = `
        SELECT 
          s.song_id, s.title, s.file_url, s.cover_url, s.duration,
          s.listen_count, s.release_date, s.created_at,
          a.artist_id, a.name as artist_name,
          al.album_id, al.title as album_title,
          g.genre_id, g.name as genre_name
        FROM songs s
        LEFT JOIN artists a ON s.artist_id = a.artist_id
        LEFT JOIN albums al ON s.album_id = al.album_id
        LEFT JOIN genres g ON s.genre_id = g.genre_id
      `;
      let params = [];

      if (search) {
        query += ' WHERE s.title LIKE ? OR a.name LIKE ?';
        params = [`%${search}%`, `%${search}%`];
      }

      query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [songs] = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM songs s LEFT JOIN artists a ON s.artist_id = a.artist_id';
      if (search) {
        countQuery += ' WHERE s.title LIKE ? OR a.name LIKE ?';
      }
      const [countResult] = await db.query(
        countQuery,
        search ? [`%${search}%`, `%${search}%`] : []
      );

      res.json({
        success: true,
        data: songs,
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting songs:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách bài hát'
      });
    }
  }

  async getSongById(req, res) {
    try {
      const { id } = req.params;

      const [songs] = await db.query(
        `SELECT 
          s.*, 
          a.name as artist_name,
          al.title as album_title,
          g.name as genre_name
        FROM songs s
        LEFT JOIN artists a ON s.artist_id = a.artist_id
        LEFT JOIN albums al ON s.album_id = al.album_id
        LEFT JOIN genres g ON s.genre_id = g.genre_id
        WHERE s.song_id = ?`,
        [id]
      );

      if (songs.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bài hát'
        });
      }

      res.json({
        success: true,
        data: songs[0]
      });
    } catch (error) {
      console.error('Error getting song:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thông tin bài hát'
      });
    }
  }

  async createSong(req, res) {
    try {
      const { title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date, lyrics, is_premium, price } = req.body;

      const [result] = await db.query(
        `INSERT INTO songs (title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date, lyrics, is_premium, price)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, 
          artist_id, 
          album_id || null, 
          genre_id || null, 
          file_url, 
          cover_url || null, 
          duration || null, 
          release_date || null,
          lyrics || null,
          is_premium || 0,
          price || 0
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Đã tạo bài hát',
        data: { song_id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating song:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo bài hát'
      });
    }
  }

  async updateSong(req, res) {
    try {
      const { id } = req.params;
      const { title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date, lyrics, is_premium, price } = req.body;

      await db.query(
        `UPDATE songs 
         SET title = ?, artist_id = ?, album_id = ?, genre_id = ?, 
             file_url = ?, cover_url = ?, duration = ?, release_date = ?,
             lyrics = ?, is_premium = ?, price = ?
         WHERE song_id = ?`,
        [
          title, 
          artist_id, 
          album_id || null, 
          genre_id || null, 
          file_url, 
          cover_url || null, 
          duration || null, 
          release_date || null,
          lyrics || null,
          is_premium || 0,
          price || 0,
          id
        ]
      );

      res.json({
        success: true,
        message: 'Đã cập nhật bài hát'
      });
    } catch (error) {
      console.error('Error updating song:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật bài hát'
      });
    }
  }

  async deleteSong(req, res) {
    try {
      const { id } = req.params;

      await db.query('DELETE FROM songs WHERE song_id = ?', [id]);

      res.json({
        success: true,
        message: 'Đã xóa bài hát'
      });
    } catch (error) {
      console.error('Error deleting song:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa bài hát'
      });
    }
  }

  // Upload handlers
  async uploadSong(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      res.json({
        success: true,
        message: 'Upload file thành công',
        data: {
          url: req.file.path,
          duration: req.file.duration || null
        }
      });
    } catch (error) {
      console.error('Error uploading song:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi upload file'
      });
    }
  }

  async uploadCover(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Không có file được upload'
        });
      }

      res.json({
        success: true,
        message: 'Upload ảnh thành công',
        data: {
          url: req.file.path
        }
      });
    } catch (error) {
      console.error('Error uploading cover:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi upload ảnh'
      });
    }
  }

  // Artist management
  async createArtist(req, res) {
    try {
      const { name, bio, image_url } = req.body;

      const [result] = await db.query(
        'INSERT INTO artists (name, bio, image_url) VALUES (?, ?, ?)',
        [name, bio || null, image_url || null]
      );

      res.status(201).json({
        success: true,
        message: 'Đã tạo nghệ sĩ',
        data: { artist_id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating artist:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo nghệ sĩ'
      });
    }
  }

  // Album management
  async getAllAlbums(req, res) {
    try {
      const [albums] = await db.query(`
        SELECT al.*, a.name as artist_name
        FROM albums al
        LEFT JOIN artists a ON al.artist_id = a.artist_id
        ORDER BY al.release_date DESC
      `);

      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Error getting albums:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách album'
      });
    }
  }

  async createAlbum(req, res) {
    try {
      const { title, artist_id, cover_url, release_date } = req.body;

      const [result] = await db.query(
        'INSERT INTO albums (title, artist_id, cover_url, release_date) VALUES (?, ?, ?, ?)',
        [title, artist_id, cover_url || null, release_date || null]
      );

      res.status(201).json({
        success: true,
        message: 'Đã tạo album',
        data: { album_id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating album:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo album'
      });
    }
  }

  async updateAlbum(req, res) {
    try {
      const { id } = req.params;
      const { title, artist_id, cover_url, release_date } = req.body;

      await db.query(
        'UPDATE albums SET title = ?, artist_id = ?, cover_url = ?, release_date = ? WHERE album_id = ?',
        [title, artist_id, cover_url || null, release_date || null, id]
      );

      res.json({
        success: true,
        message: 'Đã cập nhật album'
      });
    } catch (error) {
      console.error('Error updating album:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi cập nhật album'
      });
    }
  }

  async deleteAlbum(req, res) {
    try {
      const { id } = req.params;

      await db.query('DELETE FROM albums WHERE album_id = ?', [id]);

      res.json({
        success: true,
        message: 'Đã xóa album'
      });
    } catch (error) {
      console.error('Error deleting album:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi xóa album'
      });
    }
  }

  // Genre management
  async createGenre(req, res) {
    try {
      const { name, description } = req.body;

      const [result] = await db.query(
        'INSERT INTO genres (name, description) VALUES (?, ?)',
        [name, description || null]
      );

      res.status(201).json({
        success: true,
        message: 'Đã tạo thể loại',
        data: { genre_id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating genre:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo thể loại'
      });
    }
  }

  // Analytics
  async getAnalytics(req, res) {
    try {
      const period = req.query.period || '30d';
      let days = 30;
      if (period === '7d') days = 7;
      else if (period === '90d') days = 90;

      // Get total users
      const [usersResult] = await db.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = usersResult[0].total;

      // Get new users in period
      const [newUsersResult] = await db.query(
        `SELECT COUNT(*) as total FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      );
      const newUsers = newUsersResult[0].total;

      // Get total songs
      const [songsResult] = await db.query('SELECT COUNT(*) as total FROM songs');
      const totalSongs = songsResult[0].total;

      // Get new songs in period
      const [newSongsResult] = await db.query(
        `SELECT COUNT(*) as total FROM songs WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      );
      const newSongs = newSongsResult[0].total;

      // Get total plays
      const [playsResult] = await db.query('SELECT SUM(listen_count) as total FROM songs');
      const totalPlays = playsResult[0].total || 0;

      // Get daily plays (average per day in period) - count from listening_history
      const [dailyPlaysResult] = await db.query(
        `SELECT COALESCE(SUM(count), 0) / ? as daily 
         FROM listening_history 
         WHERE day >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
        [days, days]
      );
      const dailyPlays = Math.round(dailyPlaysResult[0].daily || 0);

      // Get total albums
      const [albumsResult] = await db.query('SELECT COUNT(*) as total FROM albums');
      const totalAlbums = albumsResult[0].total;

      // Get new albums in period (using release_date if available, otherwise count all)
      let newAlbums = 0;
      try {
        const [newAlbumsResult] = await db.query(
          `SELECT COUNT(*) as total FROM albums WHERE release_date >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
          [days]
        );
        newAlbums = newAlbumsResult[0].total || 0;
      } catch (error) {
        // If release_date doesn't exist or error, set to 0
        newAlbums = 0;
      }

      res.json({
        success: true,
        data: {
          totalUsers,
          newUsers,
          totalSongs,
          newSongs,
          totalPlays,
          dailyPlays,
          totalAlbums,
          newAlbums
        }
      });
    } catch (error) {
      console.error('Error getting analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy phân tích'
      });
    }
  }

  async getUserAnalytics(req, res) {
    try {
      // Get active users (listened to songs within last 30 days)
      const [activeUsersResult] = await db.query(`
        SELECT COUNT(DISTINCT user_id) as total
        FROM listening_history
        WHERE day >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `);
      const activeUsers = activeUsersResult[0].total || 0;

      // Get inactive users (total - active)
      const [totalUsersResult] = await db.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = totalUsersResult[0].total;
      const inactiveUsers = Math.max(0, totalUsers - activeUsers);

      // Get premium users
      const [premiumUsersResult] = await db.query(
        `SELECT COUNT(*) as total FROM users WHERE is_premium = 1 AND premium_expiry > NOW()`
      );
      const premiumUsers = premiumUsersResult[0].total || 0;

      // Get regular users
      const regularUsers = totalUsers - premiumUsers;

      res.json({
        success: true,
        data: {
          activeUsers,
          inactiveUsers,
          premiumUsers,
          regularUsers
        }
      });
    } catch (error) {
      console.error('Error getting user analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy phân tích người dùng'
      });
    }
  }

  async getSongAnalytics(req, res) {
    try {
      // Get most played songs
      const [mostPlayed] = await db.query(`
        SELECT s.song_id, s.title, s.listen_count as plays, a.name as artist_name
        FROM songs s
        LEFT JOIN artists a ON s.artist_id = a.artist_id
        ORDER BY s.listen_count DESC
        LIMIT 10
      `);

      // Get top genres
      const [topGenres] = await db.query(`
        SELECT 
          g.name,
          COUNT(s.song_id) as count,
          ROUND(COUNT(s.song_id) * 100.0 / (SELECT COUNT(*) FROM songs), 2) as percentage
        FROM genres g
        LEFT JOIN songs s ON g.genre_id = s.genre_id
        GROUP BY g.genre_id, g.name
        HAVING count > 0
        ORDER BY count DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          mostPlayed: mostPlayed || [],
          topGenres: topGenres || []
        }
      });
    } catch (error) {
      console.error('Error getting song analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy phân tích bài hát'
      });
    }
  }

  // Create system notification (admin only)
  async createSystemNotification(req, res) {
    try {
      const { title, message, user_ids, data } = req.body;

      // Validate required fields
      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required'
        });
      }

      const NotificationModel = require('../models/notification.model');

      // Create broadcast notification
      const result = await NotificationModel.createBroadcast({
        user_ids: user_ids || null, // null = send to all users
        type: 'system',
        title: title,
        message: message,
        data: data || null
      });

      res.json({
        success: true,
        message: `System notification created and sent to ${result.notification_count} users`,
        data: {
          notification_count: result.notification_count,
          title,
          message
        }
      });
    } catch (error) {
      console.error('Error creating system notification:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi tạo thông báo hệ thống'
      });
    }
  }

  // Get all artist memberships (admin)
  async getAllMemberships(req, res) {
    try {
      const { limit = 50, offset = 0, artist_id, status, search } = req.query;
      
      let query = `
        SELECT 
          am.*,
          u.username,
          u.full_name,
          u.email,
          a.name as artist_name,
          a.image_url as artist_image
        FROM artist_memberships am
        LEFT JOIN users u ON am.user_id = u.user_id
        LEFT JOIN artists a ON am.artist_id = a.artist_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (artist_id) {
        query += ' AND am.artist_id = ?';
        params.push(artist_id);
      }
      
      if (status) {
        query += ' AND am.status = ?';
        params.push(status);
      }
      
      if (search) {
        query += ' AND (u.username LIKE ? OR u.full_name LIKE ? OR a.name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      query += ' ORDER BY am.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const [memberships] = await db.execute(query, params);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM artist_memberships am
        LEFT JOIN users u ON am.user_id = u.user_id
        LEFT JOIN artists a ON am.artist_id = a.artist_id
        WHERE 1=1
      `;
      const countParams = [];
      
      if (artist_id) {
        countQuery += ' AND am.artist_id = ?';
        countParams.push(artist_id);
      }
      
      if (status) {
        countQuery += ' AND am.status = ?';
        countParams.push(status);
      }
      
      if (search) {
        countQuery += ' AND (u.username LIKE ? OR u.full_name LIKE ? OR a.name LIKE ?)';
        const searchTerm = `%${search}%`;
        countParams.push(searchTerm, searchTerm, searchTerm);
      }
      
      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;
      
      // Get stats
      const [statsResult] = await db.execute(`
        SELECT 
          COUNT(*) as total_memberships,
          COUNT(CASE WHEN status = 'active' AND expiry_date > NOW() THEN 1 END) as active_members,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_members,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_members,
          SUM(price_paid) as total_revenue
        FROM artist_memberships
      `);
      
      res.json({
        success: true,
        data: {
          memberships,
          total,
          stats: statsResult[0] || {}
        }
      });
    } catch (error) {
      console.error('Error getting memberships:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy danh sách hội viên'
      });
    }
  }

  // Get membership statistics (admin)
  async getMembershipStats(req, res) {
    try {
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as total_memberships,
          COUNT(CASE WHEN status = 'active' AND expiry_date > NOW() THEN 1 END) as active_members,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_members,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_members,
          SUM(price_paid) as total_revenue,
          COUNT(DISTINCT artist_id) as total_artists_with_memberships,
          COUNT(DISTINCT user_id) as total_users_with_memberships
        FROM artist_memberships
      `);
      
      // Get top artists by membership revenue
      const [topArtists] = await db.execute(`
        SELECT 
          a.artist_id,
          a.name,
          a.image_url,
          COUNT(am.membership_id) as membership_count,
          SUM(am.price_paid) as total_revenue
        FROM artists a
        LEFT JOIN artist_memberships am ON a.artist_id = am.artist_id
        WHERE am.membership_id IS NOT NULL
        GROUP BY a.artist_id, a.name, a.image_url
        ORDER BY total_revenue DESC
        LIMIT 10
      `);
      
      res.json({
        success: true,
        data: {
          stats: stats[0] || {},
          top_artists: topArtists
        }
      });
    } catch (error) {
      console.error('Error getting membership stats:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy thống kê hội viên'
      });
    }
  }
}

module.exports = new AdminController();

