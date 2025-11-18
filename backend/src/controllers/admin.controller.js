const db = require('../config/database');

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
        SELECT user_id, username, email, role, is_banned, avatar_url, created_at 
        FROM users
      `;
      let params = [];

      if (search) {
        query += ' WHERE username LIKE ? OR email LIKE ?';
        params = [`%${search}%`, `%${search}%`];
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [users] = await db.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      if (search) {
        countQuery += ' WHERE username LIKE ? OR email LIKE ?';
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
      const { title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date } = req.body;

      const [result] = await db.query(
        `INSERT INTO songs (title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, artist_id, album_id || null, genre_id || null, file_url, cover_url || null, duration || null, release_date || null]
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
      const { title, artist_id, album_id, genre_id, file_url, cover_url, duration, release_date } = req.body;

      await db.query(
        `UPDATE songs 
         SET title = ?, artist_id = ?, album_id = ?, genre_id = ?, 
             file_url = ?, cover_url = ?, duration = ?, release_date = ?
         WHERE song_id = ?`,
        [title, artist_id, album_id || null, genre_id || null, file_url, cover_url || null, duration || null, release_date || null, id]
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
      // Get top songs by play count
      const [topSongs] = await db.query(`
        SELECT s.song_id, s.title, s.listen_count, a.name as artist_name
        FROM songs s
        LEFT JOIN artists a ON s.artist_id = a.artist_id
        ORDER BY s.listen_count DESC
        LIMIT 10
      `);

      // Get recent activities
      const [recentActivities] = await db.query(`
        SELECT 'song' as type, title as name, created_at
        FROM songs
        UNION ALL
        SELECT 'user' as type, username as name, created_at
        FROM users
        ORDER BY created_at DESC
        LIMIT 20
      `);

      res.json({
        success: true,
        data: {
          topSongs,
          recentActivities
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
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END) as banned_users,
          SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
        FROM users
      `);

      res.json({
        success: true,
        data: stats[0]
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
      const [stats] = await db.query(`
        SELECT 
          COUNT(*) as total_songs,
          SUM(listen_count) as total_plays,
          AVG(listen_count) as avg_plays_per_song
        FROM songs
      `);

      res.json({
        success: true,
        data: stats[0]
      });
    } catch (error) {
      console.error('Error getting song analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi khi lấy phân tích bài hát'
      });
    }
  }
}

module.exports = new AdminController();

