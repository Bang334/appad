const ArtistModel = require('../models/artist.model');
const RevenueSharingModel = require('../models/revenue-sharing.model');
const TransactionModel = require('../models/transaction.model');
const UserModel = require('../models/user.model');
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
          SUM(CASE WHEN share_type = 'premium_stream' THEN artist_share ELSE 0 END) as premium_stream_revenue,
          SUM(CASE WHEN is_paid_to_artist = 1 THEN artist_share ELSE 0 END) as paid_revenue,
          SUM(CASE WHEN is_paid_to_artist = 0 THEN artist_share ELSE 0 END) as unpaid_revenue,
          SUM(stream_count) as total_streams
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
      // Khi dùng Cloudinary, file.path hoặc file.secure_url chứa link trực tiếp
      const fileUrl = file.path || file.secure_url;

      // Extract duration from audio file
      let duration = null;
      try {
        // Try to get duration from Cloudinary response first
        if (file.duration) {
          duration = Math.round(file.duration);
        } else if (file.format && file.format.duration) {
          duration = Math.round(file.format.duration);
        } else {
          // If not in response, fetch the file and extract duration
          duration = await ArtistController.extractDurationFromUrl(fileUrl);
        }
      } catch (durationError) {
        console.error('Error extracting duration:', durationError);
        // Continue without duration if extraction fails
      }

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
  static async extractDurationFromUrl(url, retries = 2) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      
      const attemptExtract = (attemptNumber) => {
        console.log(`🔄 [extractDurationFromUrl] Attempt ${attemptNumber}/${retries + 1} for URL: ${url}`);
        
        protocol.get(url, (response) => {
          if (response.statusCode !== 200) {
            if (attemptNumber < retries) {
              console.log(`⚠️ [extractDurationFromUrl] Failed with status ${response.statusCode}, retrying...`);
              setTimeout(() => attemptExtract(attemptNumber + 1), 1000 * attemptNumber); // Wait longer for each retry
              return;
            }
            reject(new Error(`Failed to fetch file: ${response.statusCode}`));
            return;
          }

          const chunks = [];
          let totalSize = 0;
          const maxSize = 50 * 1024 * 1024; // 50MB limit
          
          response.on('data', (chunk) => {
            chunks.push(chunk);
            totalSize += chunk.length;
            if (totalSize > maxSize) {
              response.destroy();
              reject(new Error('File too large'));
            }
          });

          response.on('end', async () => {
            try {
              const buffer = Buffer.concat(chunks);
              console.log(`📦 [extractDurationFromUrl] Downloaded ${buffer.length} bytes, parsing metadata...`);
              
              // Parse with options to handle various audio formats
              const metadata = await mm.parseBuffer(buffer, {
                mimeType: response.headers['content-type'] || 'audio/mpeg',
                size: buffer.length
              });
              
              const durationInSeconds = metadata.format.duration 
                ? Math.round(metadata.format.duration) 
                : 0;
              
              console.log(`✅ [extractDurationFromUrl] Extracted duration: ${durationInSeconds}s from metadata:`, {
                format: metadata.format.container,
                codec: metadata.format.codec,
                duration: metadata.format.duration
              });
              
              if (durationInSeconds > 0) {
                resolve(durationInSeconds);
              } else {
                // If duration is 0, try retry if we have attempts left
                if (attemptNumber < retries) {
                  console.log(`⚠️ [extractDurationFromUrl] Duration is 0, retrying...`);
                  setTimeout(() => attemptExtract(attemptNumber + 1), 2000 * attemptNumber);
                } else {
                  console.warn(`⚠️ [extractDurationFromUrl] Duration is 0 after all attempts`);
                  resolve(0); // Return 0 instead of rejecting
                }
              }
            } catch (error) {
              console.error(`❌ [extractDurationFromUrl] Error parsing audio metadata (attempt ${attemptNumber}):`, error.message);
              if (attemptNumber < retries) {
                console.log(`🔄 [extractDurationFromUrl] Retrying due to parse error...`);
                setTimeout(() => attemptExtract(attemptNumber + 1), 2000 * attemptNumber);
              } else {
                reject(error);
              }
            }
          });

          response.on('error', (error) => {
            console.error(`❌ [extractDurationFromUrl] Response error (attempt ${attemptNumber}):`, error.message);
            if (attemptNumber < retries) {
              setTimeout(() => attemptExtract(attemptNumber + 1), 1000 * attemptNumber);
            } else {
              reject(error);
            }
          });
        }).on('error', (error) => {
          console.error(`❌ [extractDurationFromUrl] Request error (attempt ${attemptNumber}):`, error.message);
          if (attemptNumber < retries) {
            setTimeout(() => attemptExtract(attemptNumber + 1), 1000 * attemptNumber);
          } else {
            reject(error);
          }
        });
      };
      
      attemptExtract(0);
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

      // Auto-extract duration if file_url is provided but duration is missing or 0
      // This ensures duration is always set when creating a song
      if (songData.file_url && (!songData.duration || songData.duration === 0) && (songData.file_url.startsWith('http://') || songData.file_url.startsWith('https://'))) {
        try {
          console.log(`🔄 [createSong] Extracting duration from file_url for song: ${songData.title}`);
          // Add a small delay to ensure Cloudinary has processed the file
          await new Promise(resolve => setTimeout(resolve, 500));
          const extractedDuration = await ArtistController.extractDurationFromUrl(songData.file_url, 2);
          if (extractedDuration && extractedDuration > 0) {
            songData.duration = extractedDuration;
            console.log(`✅ [createSong] Auto-extracted duration: ${extractedDuration} seconds for song: ${songData.title}`);
          } else {
            console.warn(`⚠️ [createSong] Extracted duration is invalid or 0: ${extractedDuration}, will try again later when playing`);
          }
        } catch (durationError) {
          console.error('⚠️ [createSong] Could not extract duration from file_url:', durationError.message);
          console.log(`ℹ️ [createSong] Duration will be extracted when song is played`);
          // Continue without duration if extraction fails - it will be updated when played
        }
      } else if (songData.duration && songData.duration > 0) {
        console.log(`ℹ️ [createSong] Duration already provided: ${songData.duration}s for song: ${songData.title}`);
      } else if (!songData.file_url) {
        console.warn(`⚠️ [createSong] No file_url provided, cannot extract duration`);
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

      // Auto-extract duration if file_url is provided/updated but duration is missing or 0
      // This ensures duration is always set when updating a song
      if (songData.file_url && (!songData.duration || songData.duration === 0) && (songData.file_url.startsWith('http://') || songData.file_url.startsWith('https://'))) {
        try {
          console.log(`🔄 [updateSong] Extracting duration from file_url for song: ${song_id}`);
          // Add a small delay to ensure Cloudinary has processed the file
          await new Promise(resolve => setTimeout(resolve, 500));
          const extractedDuration = await ArtistController.extractDurationFromUrl(songData.file_url, 2);
          if (extractedDuration && extractedDuration > 0) {
            songData.duration = extractedDuration;
            console.log(`✅ [updateSong] Auto-extracted duration: ${extractedDuration} seconds for song update: ${song_id}`);
          } else {
            console.warn(`⚠️ [updateSong] Extracted duration is invalid or 0: ${extractedDuration}, will try again later when playing`);
          }
        } catch (durationError) {
          console.error('⚠️ [updateSong] Could not extract duration from file_url:', durationError.message);
          console.log(`ℹ️ [updateSong] Duration will be extracted when song is played`);
          // Continue without duration if extraction fails - it will be updated when played
        }
      } else if (songData.duration && songData.duration > 0) {
        console.log(`ℹ️ [updateSong] Duration already provided: ${songData.duration}s for song: ${song_id}`);
      } else if (!songData.file_url) {
        console.warn(`⚠️ [updateSong] No file_url provided, cannot extract duration`);
      }

      const updated = await SongModel.update(song_id, songData);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
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
      const albums = await AlbumModel.findByArtist(artist_id);
      
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
        albumData.cover_url = `/uploads/covers/${req.files.cover[0].filename}`;
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

      const albumData = req.body;
      // Prevent changing artist_id
      delete albumData.artist_id;
      
      // Handle file uploads if present
      if (req.files && req.files.cover) {
        albumData.cover_url = `/uploads/covers/${req.files.cover[0].filename}`;
      }

      const updated = await AlbumModel.update(album_id, albumData);
      
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
}

module.exports = ArtistController;
