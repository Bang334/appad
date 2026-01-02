const ArtistModel = require('../models/artist.model');
const RevenueSharingModel = require('../models/revenue-sharing.model');
const TransactionModel = require('../models/transaction.model');
const UserModel = require('../models/user.model');
const NotificationModel = require('../models/notification.model');
const https = require('https');
const http = require('http');
const mm = require('music-metadata');

class ArtistController {
  // Get all artists (public)
  static async getAll(req, res) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      const artists = await ArtistModel.findAll(limit, offset);

      res.json({
        success: true,
        data: artists
      });
    } catch (error) {
      console.error('Get all artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist by ID (public)
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const artist = await ArtistModel.findById(id);

      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        data: artist
      });
    } catch (error) {
      console.error('Get artist error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist dashboard (wallet + stats)
  static async getDashboard(req, res) {
    try {
      const { artist_id } = req.params;

      const [wallet, stats, revenueStats, unpaid] = await Promise.all([
        ArtistModel.getWalletInfo(artist_id),
        ArtistModel.getStatistics(artist_id),
        RevenueSharingModel.getStatsByArtist(artist_id),
        RevenueSharingModel.getUnpaidByArtist(artist_id),
      ]);

      res.json({
        success: true,
        data: {
          wallet,
          stats,
          revenue_stats: revenueStats,
          unpaid: unpaid || { unpaid_amount: 0, unpaid_count: 0 },
        }
      });
    } catch (error) {
      console.error('Get artist dashboard error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist revenue history
  static async getRevenueHistory(req, res) {
    try {
      const { artist_id } = req.params;
      const { limit = 50, offset = 0, period, share_type, is_paid } = req.query;

      const revenue = await RevenueSharingModel.findByArtist(artist_id, {
        limit,
        offset,
        period,
        shareType: share_type,
        isPaid: is_paid !== undefined ? is_paid === 'true' : undefined,
      });

      res.json({
        success: true,
        data: revenue
      });
    } catch (error) {
      console.error('Get revenue history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get revenue statistics (overview, top songs, charts)
  static async getRevenueStats(req, res) {
    try {
      const { artist_id } = req.params;
      const { start_date, end_date, period = 'all' } = req.query; // period: 7d, 30d, 3m, 1y, all

      const db = require('../config/database');
      let dateFilter = '';
      const params = [artist_id];

      // Calculate date range based on period
      if (period !== 'all' && !start_date && !end_date) {
        const now = new Date();
        let startDate = new Date();
        
        switch (period) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '3m':
            startDate.setMonth(now.getMonth() - 3);
            break;
          case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        dateFilter = ' AND rs.created_at >= ?';
        params.push(startDate.toISOString().split('T')[0]);
      } else if (start_date && end_date) {
        dateFilter = ' AND rs.created_at >= ? AND rs.created_at <= ?';
        params.push(start_date, end_date);
      }

      // Get overview stats
      const [overview] = await db.execute(
        `SELECT 
          COUNT(*) as total_transactions,
          SUM(artist_share) as total_revenue,
          SUM(CASE WHEN share_type = 'direct_purchase' THEN artist_share ELSE 0 END) as direct_purchase_revenue,
          SUM(CASE WHEN share_type = 'premium_stream' THEN artist_share ELSE 0 END) as premium_stream_revenue
         FROM revenue_sharing rs
         WHERE rs.artist_id = ?${dateFilter}`,
        params
      );

      // Get top songs by purchase count
      const [topSongs] = await db.execute(
        `SELECT 
          rs.song_id,
          s.title as song_title,
          s.cover_url,
          COUNT(DISTINCT rs.purchase_id) as purchase_count,
          SUM(rs.artist_share) as total_revenue,
          SUM(rs.total_amount) as total_sales
         FROM revenue_sharing rs
         LEFT JOIN songs s ON rs.song_id = s.song_id
         WHERE rs.artist_id = ? 
         AND rs.share_type = 'direct_purchase'
         AND rs.song_id IS NOT NULL${dateFilter}
         GROUP BY rs.song_id, s.title, s.cover_url
         ORDER BY purchase_count DESC, total_revenue DESC
         LIMIT 10`,
        params
      );

      // Get revenue chart data (daily for last 30 days, or by period)
      const chartPeriod = period === '7d' ? 'daily' : period === '30d' ? 'daily' : 'monthly';
      let chartQuery = '';
      
      if (chartPeriod === 'daily') {
        chartQuery = `
          SELECT 
            DATE(rs.created_at) as date,
            SUM(rs.artist_share) as revenue,
            COUNT(*) as transactions
          FROM revenue_sharing rs
          WHERE rs.artist_id = ?${dateFilter}
          GROUP BY DATE(rs.created_at)
          ORDER BY date ASC
        `;
      } else {
        chartQuery = `
          SELECT 
            DATE_FORMAT(rs.created_at, '%Y-%m') as date,
            SUM(rs.artist_share) as revenue,
            COUNT(*) as transactions
          FROM revenue_sharing rs
          WHERE rs.artist_id = ?${dateFilter}
          GROUP BY DATE_FORMAT(rs.created_at, '%Y-%m')
          ORDER BY date ASC
        `;
      }

      const [chartData] = await db.execute(chartQuery, params);

      // Get revenue by type
      const [revenueByType] = await db.execute(
        `SELECT 
          share_type,
          COUNT(*) as count,
          SUM(artist_share) as total_revenue,
          SUM(total_amount) as total_sales
         FROM revenue_sharing rs
         WHERE rs.artist_id = ?${dateFilter}
         GROUP BY share_type`,
        params
      );

      res.json({
        success: true,
        data: {
          overview: overview[0] || {},
          top_songs: topSongs,
          chart_data: chartData,
          revenue_by_type: revenueByType,
          period: period,
          date_range: {
            start: start_date || (period !== 'all' ? params[params.length - 1] : null),
            end: end_date || null
          }
        }
      });
    } catch (error) {
      console.error('Get revenue stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Request withdrawal
  static async requestWithdrawal(req, res) {
    try {
      const { artist_id } = req.params;
      const { amount, artist_note } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid amount'
        });
      }

      // Get artist and user info
      const artist = await ArtistModel.findById(artist_id);
      if (!artist || !artist.user_id) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found or not linked to user'
        });
      }

      const wallet = await ArtistModel.getWalletInfo(artist_id);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Check minimum withdrawal (50,000đ)
      if (amount < 50000) {
        return res.status(400).json({
          success: false,
          message: 'Minimum withdrawal amount is 50,000đ'
        });
      }

      // Check balance (from user)
      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: {
            current_balance: wallet.balance,
            requested: amount,
            needed: amount - wallet.balance
          }
        });
      }

      // Check bank info
      if (!wallet.bank_name || !wallet.bank_account || !wallet.bank_account_name) {
        return res.status(400).json({
          success: false,
          message: 'Please update bank information first'
        });
      }

      // Create withdrawal transaction (pending)
      const transactionId = await TransactionModel.create({
        user_id: artist.user_id,
        type: 'withdraw',
        amount: amount,
        status: 'pending',
        description: `Rút tiền - ${wallet.bank_name} - ${wallet.bank_account}`,
        reference_code: `WD${Date.now()}${artist_id}`
      });

      // Notify Admins
      try {
        const admins = await UserModel.findAdmins();
        if (admins.length > 0) {
          const adminIds = admins.map(a => a.user_id);
          await NotificationModel.createBroadcast({
            user_ids: adminIds,
            type: 'system',
            title: 'Yêu cầu rút tiền mới',
            message: `Nghệ sĩ ${artist.name} vừa yêu cầu rút ${parseFloat(amount).toLocaleString('vi-VN')}đ về ngân hàng ${wallet.bank_name}.`,
            data: {
              transaction_id: transactionId,
              artist_id: artist_id,
              amount: amount,
              action: 'approve_withdrawal'
            }
          });
        }
      } catch (notifyError) {
        console.error('Notify admin withdrawal error:', notifyError);
        // Don't fail the request if notification fails
      }

      res.json({
        success: true,
        message: 'Withdrawal request submitted successfully',
        data: {
          transaction_id: transactionId,
          amount,
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Request withdrawal error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get withdrawal history
  static async getWithdrawals(req, res) {
    try {
      const { artist_id } = req.params;
      const { limit = 50, offset = 0, status } = req.query;

      // Get artist's user_id
      const artist = await ArtistModel.findById(artist_id);
      if (!artist || !artist.user_id) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found or not linked to user'
        });
      }

      // Get withdrawals from transactions
      const limitNum = Math.max(1, Math.min(parseInt(limit) || 50, 1000));
      const offsetNum = Math.max(0, parseInt(offset) || 0);
      
      let query = `
        SELECT 
          t.transaction_id as withdrawal_id,
          t.*, 
          a.bank_name, 
          a.bank_account, 
          a.bank_account_name,
          0 as fee,
          t.amount as actual_amount,
          t.created_at as requested_at,
          t.updated_at as processed_at
        FROM transactions t
        LEFT JOIN artists a ON a.user_id = t.user_id
        WHERE t.user_id = ? AND t.type = 'withdraw'
      `;
      const params = [artist.user_id];

      if (status) {
        query += ' AND t.status = ?';
        params.push(status);
      }

      query += ` ORDER BY t.created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

      const [withdrawals] = await require('../config/database').execute(query, params);

      res.json({
        success: true,
        data: withdrawals
      });
    } catch (error) {
      console.error('Get withdrawals error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update bank info
  static async updateBankInfo(req, res) {
    try {
      const { artist_id } = req.params;
      const { bank_name, bank_account, bank_account_name } = req.body;

      if (!bank_name || !bank_account || !bank_account_name) {
        return res.status(400).json({
          success: false,
          message: 'All bank information fields are required'
        });
      }

      const updated = await ArtistModel.updateBankInfo(artist_id, {
        bank_name,
        bank_account,
        bank_account_name
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        message: 'Bank information updated successfully'
      });
    } catch (error) {
      console.error('Update bank info error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist balance (from user balance)
  static async getBalance(req, res) {
    try {
      const { artist_id } = req.params;
      
      const wallet = await ArtistModel.getWalletInfo(artist_id);
      
      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      res.json({
        success: true,
        data: {
          balance: parseFloat(wallet.balance || 0),
          total_earned: parseFloat(wallet.total_earned || 0),
          total_withdrawn: parseFloat(wallet.total_withdrawn || 0)
        }
      });
    } catch (error) {
      console.error('Get artist balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist's songs
  static async getMySongs(req, res) {
    try {
      const { artist_id } = req.params;
      const SongModel = require('../models/song.model');
      const songs = await SongModel.findByArtist(artist_id);
      
      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get artist songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist's reviews
  static async getReviews(req, res) {
    try {
      const { artist_id } = req.params;
      const { limit = 50, offset = 0, song_id, rating, sort_by } = req.query;
      const CommentModel = require('../models/comment.model');
      
      const reviews = await CommentModel.findByArtist(artist_id, {
        limit,
        offset,
        songId: song_id,
        rating: rating,
        sortBy: sort_by
      });
      
      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Get artist reviews error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Upload song file
  static async uploadSong(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No song file uploaded'
        });
      }

      const file = req.file;
      console.log('📤 [uploadSong] File received:', JSON.stringify(file, null, 2));
      
      // Khi dùng Cloudinary, file.path hoặc file.secure_url chứa link trực tiếp
      const fileUrl = file.path || file.secure_url;
      console.log('📤 [uploadSong] File URL:', fileUrl);

      // Extract duration from audio file
      let duration = null;
      try {
        // Try to get duration from Cloudinary response first
        console.log('⏱️ [uploadSong] Checking Cloudinary duration...');
        console.log('⏱️ [uploadSong] file.duration:', file.duration);
        console.log('⏱️ [uploadSong] file.format:', file.format);
        
        if (file.duration) {
          duration = Math.round(file.duration);
          console.log('✅ [uploadSong] Got duration from file.duration:', duration);
        } else if (file.format && file.format.duration) {
          duration = Math.round(file.format.duration);
          console.log('✅ [uploadSong] Got duration from file.format.duration:', duration);
        } else {
          // If not in response, fetch the file and extract duration
          console.log('⏱️ [uploadSong] No duration in Cloudinary response, extracting from URL...');
          duration = await ArtistController.extractDurationFromUrl(fileUrl);
          console.log('✅ [uploadSong] Extracted duration from URL:', duration);
        }
      } catch (durationError) {
        console.error('❌ [uploadSong] Error extracting duration:', durationError.message);
        // Continue without duration if extraction fails
      }

      console.log('📤 [uploadSong] Final response duration:', duration);
      
      res.json({
        success: true,
        message: 'Upload successful',
        data: {
          url: fileUrl,
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          duration: duration // Duration in seconds
        }
      });
    } catch (error) {
      console.error('Upload song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during upload'
      });
    }
  }

  // Helper method to extract duration from audio file URL
  static async extractDurationFromUrl(url) {
    console.log('⏱️ [extractDurationFromUrl] Starting extraction for:', url);
    
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      protocol.get(url, (response) => {
        console.log('⏱️ [extractDurationFromUrl] Response status:', response.statusCode);
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch file: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        let totalSize = 0;
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
          totalSize += chunk.length;
        });

        response.on('end', async () => {
          try {
            console.log('⏱️ [extractDurationFromUrl] Downloaded', totalSize, 'bytes');
            const buffer = Buffer.concat(chunks);
            const metadata = await mm.parseBuffer(buffer);
            console.log('⏱️ [extractDurationFromUrl] Metadata format:', metadata.format);
            
            let durationInSeconds = 0;
            
            // Try to get duration directly from metadata
            if (metadata.format.duration && metadata.format.duration > 0) {
              durationInSeconds = Math.round(metadata.format.duration);
              console.log('✅ [extractDurationFromUrl] Duration from metadata:', durationInSeconds, 'seconds');
            } 
            // Fallback: Calculate from bitrate and file size (for ADTS/AAC streams)
            else if (metadata.format.bitrate && totalSize > 0) {
              // duration = (fileSize in bits) / (bitrate in bits per second)
              durationInSeconds = Math.round((totalSize * 8) / metadata.format.bitrate);
              console.log('✅ [extractDurationFromUrl] Duration calculated from bitrate:', durationInSeconds, 'seconds');
              console.log('   (bitrate:', metadata.format.bitrate, 'bps, size:', totalSize, 'bytes)');
            } else {
              console.warn('⚠️ [extractDurationFromUrl] Cannot determine duration - no duration or bitrate in metadata');
            }
            
            resolve(durationInSeconds);
          } catch (error) {
            console.error('❌ [extractDurationFromUrl] Error parsing audio metadata:', error.message);
            reject(error);
          }
        });

        response.on('error', (error) => {
          console.error('❌ [extractDurationFromUrl] Response error:', error.message);
          reject(error);
        });
      }).on('error', (error) => {
        console.error('❌ [extractDurationFromUrl] Request error:', error.message);
        reject(error);
      });
    });
  }

  // Upload cover file
  static async uploadCover(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No cover file uploaded'
        });
      }

      const file = req.file;
      const fileUrl = file.path || file.secure_url;

      res.json({
        success: true,
        message: 'Upload successful',
        data: {
          url: fileUrl,
          filename: file.filename
        }
      });
    } catch (error) {
      console.error('Upload cover error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during upload'
      });
    }
  }

  // Create song (Artist)
  static async createSong(req, res) {
    try {
      console.log('🎵 createSong - Request received:', req.body);
      
      const { artist_id } = req.params;
      const SongModel = require('../models/song.model');
      const FollowModel = require('../models/follow.model');
      const NotificationModel = require('../models/notification.model');
      const songData = req.body;
      
      // Ensure artist_id matches
      songData.artist_id = parseInt(artist_id);
      
      // Handle file uploads if present (backward compatibility)
      if (req.files) {
        if (req.files.audio) {
          songData.file_url = `/uploads/songs/${req.files.audio[0].filename}`;
        }
        if (req.files.cover) {
          songData.cover_url = `/uploads/covers/${req.files.cover[0].filename}`;
        }
      }

      // Auto-extract duration if file_url is provided but duration is missing
      if (songData.file_url && !songData.duration && (songData.file_url.startsWith('http://') || songData.file_url.startsWith('https://'))) {
        try {
          const extractedDuration = await ArtistController.extractDurationFromUrl(songData.file_url);
          if (extractedDuration && extractedDuration > 0) {
            songData.duration = extractedDuration;
            console.log(`✅ Auto-extracted duration: ${extractedDuration} seconds for song: ${songData.title}`);
          }
        } catch (durationError) {
          console.error('⚠️ Could not extract duration from file_url:', durationError.message);
          // Continue without duration if extraction fails
        }
      }

      const songId = await SongModel.create(songData);
      
      // Get artist info
      const artist = await ArtistModel.findById(artist_id);
      
      // Create notifications for all followers
      const followers = await FollowModel.getArtistFollowers(artist_id, 1000, 0);
      
      if (followers && followers.length > 0) {
        // Create notification for each follower
        const notificationPromises = followers.map(follower =>
          NotificationModel.create({
            user_id: follower.user_id,
            type: 'new_song',
            title: 'Bài hát mới',
            message: `${artist?.name || 'Nghệ sĩ'} vừa ra mắt bài hát "${songData.title}"`,
            data: {
              song_id: songId,
              artist_id: artist_id,
              artist_name: artist?.name,
              song_title: songData.title
            }
          })
        );
        
        await Promise.all(notificationPromises);
        console.log(`Created ${followers.length} notifications for new song: ${songData.title}`);
      }
      
      res.status(201).json({
        success: true,
        message: 'Song created successfully',
        data: { song_id: songId }
      });
    } catch (error) {
      console.error('Create song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update song (Artist - only their own songs)
  static async updateSong(req, res) {
    try {
      const { artist_id, song_id } = req.params;
      const SongModel = require('../models/song.model');
      
      // Check if song belongs to this artist
      const song = await SongModel.findById(song_id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }
      
      if (song.artist_id !== parseInt(artist_id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this song'
        });
      }

      const songData = req.body;
      // Prevent changing artist_id
      delete songData.artist_id;
      
      // Handle file uploads if present
      if (req.files) {
        if (req.files.audio) {
          songData.file_url = `/uploads/songs/${req.files.audio[0].filename}`;
        }
        if (req.files.cover) {
          songData.cover_url = `/uploads/covers/${req.files.cover[0].filename}`;
        }
      }

      // Auto-extract duration if file_url is provided/updated but duration is missing
      if (songData.file_url && !songData.duration && (songData.file_url.startsWith('http://') || songData.file_url.startsWith('https://'))) {
        try {
          const extractedDuration = await ArtistController.extractDurationFromUrl(songData.file_url);
          if (extractedDuration && extractedDuration > 0) {
            songData.duration = extractedDuration;
            console.log(`✅ Auto-extracted duration: ${extractedDuration} seconds for song update: ${song_id}`);
          }
        } catch (durationError) {
          console.error('⚠️ Could not extract duration from file_url:', durationError.message);
          // Continue without duration if extraction fails
        }
      }

      const updated = await SongModel.update(song_id, songData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Update associated notifications if title changed
      if (songData.title && songData.title !== song.title) {
        try {
          await NotificationModel.updateSongNotifications(song_id, songData.title);
        } catch (notifError) {
          console.error('Error updating song notifications:', notifError);
        }
      }

      res.json({
        success: true,
        message: 'Song updated successfully'
      });
    } catch (error) {
      console.error('Update song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete song (Artist - only their own songs)
  static async deleteSong(req, res) {
    try {
      const { artist_id, song_id } = req.params;
      const SongModel = require('../models/song.model');
      const PurchasedSongModel = require('../models/purchased-song.model');
      
      // Check if song belongs to this artist
      const song = await SongModel.findById(song_id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }
      
      if (song.artist_id !== parseInt(artist_id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this song'
        });
      }

      // Check if song is premium and has been purchased
      if (song.is_premium) {
        const purchaseCount = await PurchasedSongModel.getPurchaseCount(song_id);
        if (purchaseCount > 0) {
          return res.status(403).json({
            success: false,
            message: 'Cannot delete a premium song that has been purchased by users'
          });
        }
      }

      const deleted = await SongModel.delete(song_id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Delete associated notifications
      try {
        await NotificationModel.deleteByRelatedEntity('new_song', 'song_id', song_id);
      } catch (notifError) {
        console.error('Error deleting song notifications:', notifError);
      }

      res.json({
        success: true,
        message: 'Song deleted successfully'
      });
    } catch (error) {
      console.error('Delete song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get artist's albums
  static async getMyAlbums(req, res) {
    try {
      const { artist_id } = req.params;
      const AlbumModel = require('../models/album.model');
      // Artist should see all their albums (including unreleased)
      const albums = await AlbumModel.findByArtist(artist_id, true);
      
      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Get artist albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Create album (Artist)
  static async createAlbum(req, res) {
    try {
      const { artist_id } = req.params;
      const AlbumModel = require('../models/album.model');
      const albumData = req.body;
      
      // Ensure artist_id matches
      albumData.artist_id = parseInt(artist_id);
      
      // Handle file uploads if present
      if (req.files && req.files.cover) {
        const file = req.files.cover[0];
        // Use Cloudinary URL (path or secure_url)
        albumData.cover_url = file.path || file.secure_url;
      }

      const albumId = await AlbumModel.create(albumData);
      
      res.status(201).json({
        success: true,
        message: 'Album created successfully',
        data: { album_id: albumId }
      });
    } catch (error) {
      console.error('Create album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update album (Artist - only their own albums)
  static async updateAlbum(req, res) {
    try {
      const { artist_id, album_id } = req.params;
      const AlbumModel = require('../models/album.model');
      
      // Check if album belongs to this artist
      const album = await AlbumModel.findById(album_id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }
      
      if (album.artist_id !== parseInt(artist_id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this album'
        });
      }

      const allowedFields = ['title', 'release_date', 'is_premium', 'price'];
      const updateData = {};
      
      // Only include allowed fields
      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          // Format release_date if present
          if (field === 'release_date' && req.body[field]) {
             try {
                // Parse and format to MySQL datetime, keeping LOCAL time (not UTC)
                const date = new Date(req.body[field]);
                if (!isNaN(date.getTime())) {
                   // Use local time components instead of toISOString() which converts to UTC
                   const year = date.getFullYear();
                   const month = String(date.getMonth() + 1).padStart(2, '0');
                   const day = String(date.getDate()).padStart(2, '0');
                   const hours = String(date.getHours()).padStart(2, '0');
                   const minutes = String(date.getMinutes()).padStart(2, '0');
                   const seconds = String(date.getSeconds()).padStart(2, '0');
                   updateData[field] = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
                } else {
                   updateData[field] = req.body[field];
                }
             } catch (e) {
                updateData[field] = req.body[field];
             }
          } else if (field === 'is_premium') {
            // Convert boolean/string 'true'/'false' to 1/0
             const val = req.body[field];
             updateData[field] = (val === true || val === 'true' || val === 1 || val === '1') ? 1 : 0;
          } else {
             updateData[field] = req.body[field];
          }
        }
      });
      
      // Handle file uploads if present
      if (req.files && req.files.cover) {
        const file = req.files.cover[0];
        // Use Cloudinary URL (path or secure_url)
        updateData.cover_url = file.path || file.secure_url;
      }

      const updated = await AlbumModel.update(album_id, updateData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      res.json({
        success: true,
        message: 'Album updated successfully'
      });
    } catch (error) {
      console.error('Update album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Delete album (Artist - only their own albums)
  static async deleteAlbum(req, res) {
    try {
      const { artist_id, album_id } = req.params;
      const AlbumModel = require('../models/album.model');
      
      // Check if album belongs to this artist
      const album = await AlbumModel.findById(album_id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }
      
      if (album.artist_id !== parseInt(artist_id)) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this album'
        });
      }

      const deleted = await AlbumModel.delete(album_id);
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      res.json({
        success: true,
        message: 'Album deleted successfully'
      });
    } catch (error) {
      console.error('Delete album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update artist profile
  static async updateProfile(req, res) {
    try {
      const { artist_id } = req.params;
      const { name, bio, country, image_url, membership_price, membership_duration_days } = req.body;

      console.log('[updateProfile] Request body:', req.body);
      console.log('[updateProfile] Request file:', req.file);

      // Get current artist
      const artist = await ArtistModel.findById(artist_id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Build update data
      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;
      if (country !== undefined) updateData.country = country ? country.trim() : null;
      if (membership_price !== undefined) updateData.membership_price = parseFloat(membership_price) || 0;
      if (membership_duration_days !== undefined) updateData.membership_duration_days = parseInt(membership_duration_days) || 30;
      
      // Handle image - prioritize uploaded file over image_url from body
      if (req.file) {
        // Image was uploaded via Cloudinary middleware
        const fileUrl = req.file.path || req.file.secure_url;
        console.log('[updateProfile] Image uploaded to Cloudinary:', fileUrl);
        updateData.image_url = fileUrl;
      } else if (image_url !== undefined) {
        // Use image_url from body (could be existing URL or null to clear)
        updateData.image_url = image_url || null;
      }

      // Update in database
      const db = require('../config/database');
      const fields = Object.keys(updateData);
      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      const setClause = fields.map(f => `${f} = ?`).join(', ');
      const values = [...fields.map(f => updateData[f]), artist_id];

      await db.execute(
        `UPDATE artists SET ${setClause}, updated_at = NOW() WHERE artist_id = ?`,
        values
      );

      // Return updated artist
      const updatedArtist = await ArtistModel.findById(artist_id);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedArtist
      });
    } catch (error) {
      console.error('Update artist profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ArtistController;
