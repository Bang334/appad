const UserModel = require('../models/user.model');
const SongModel = require('../models/song.model');
const PurchasedSongModel = require('../models/purchased-song.model');
const AlbumModel = require('../models/album.model');
const PurchasedAlbumModel = require('../models/purchased-album.model');
const TransactionModel = require('../models/transaction.model');
const RevenueSharingModel = require('../models/revenue-sharing.model');
const ArtistModel = require('../models/artist.model');
const NotificationModel = require('../models/notification.model');

class PremiumController {
  // Subscribe to premium
  static async subscribe(req, res) {
    try {
      const userId = req.user.user_id;
      const { duration_days = 30 } = req.body;

      // Premium price (99k for 30 days)
      const price = 99000;

      // Check user balance
      const balance = await UserModel.getBalance(userId);
      if (balance < price) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: {
            required: price,
            current_balance: balance,
            needed: price - balance
          }
        });
      }

      // Deduct balance
      const deductResult = await UserModel.subtractBalance(userId, price);
      if (!deductResult.success) {
        return res.status(400).json({
          success: false,
          message: deductResult.message
        });
      }

      // Subscribe user to premium
      const success = await UserModel.subscribePremium(userId, parseInt(duration_days));

      if (!success) {
        // Rollback: add balance back if subscription failed
        await UserModel.addBalance(userId, price);
        return res.status(500).json({
          success: false,
          message: 'Failed to subscribe to premium'
        });
      }

      // Create transaction record
      const transactionId = await TransactionModel.create({
        user_id: userId,
        type: 'subscription',
        amount: price,
        status: 'completed',
        description: `Đăng ký Premium ${duration_days} ngày`
      });

      // Get updated user info
      const expiryDate = await UserModel.getPremiumExpiry(userId);
      const newBalance = await UserModel.getBalance(userId);

      // Create spend notification for user
      await NotificationModel.create({
        user_id: userId,
        type: 'spend',
        title: 'Đăng ký Premium thành công',
        message: `Bạn đã đăng ký Premium ${duration_days} ngày với giá ${price.toLocaleString('vi-VN')}đ. Premium sẽ hết hạn vào ${new Date(expiryDate).toLocaleDateString('vi-VN')}`,
        data: {
          transaction_id: transactionId,
          amount: price,
          duration_days: duration_days,
          premium_expiry: expiryDate,
          new_balance: newBalance,
          type: 'subscription'
        }
      });

      res.json({
        success: true,
        message: 'Successfully subscribed to premium',
        data: {
          is_premium: true,
          premium_expiry: expiryDate,
          new_balance: newBalance
        }
      });
    } catch (error) {
      console.error('Subscribe premium error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Check premium status
  static async checkStatus(req, res) {
    try {
      const userId = req.user.user_id;
      
      const isPremium = await UserModel.isPremiumActive(userId);
      const expiryDate = isPremium ? await UserModel.getPremiumExpiry(userId) : null;

      // Check and create premium_expiring notification if needed
      if (isPremium && expiryDate) {
        const expiry = new Date(expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        // Create notification if premium expires in 3 days or less
        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
          // Check if notification already exists for this expiry period (within last 24 hours)
          const db = require('../config/database');
          const [existing] = await db.execute(
            `SELECT notification_id FROM notifications 
             WHERE user_id = ? AND type = 'premium_expiring' 
             AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)`,
            [userId]
          );

          if (existing.length === 0) {
            const expiryFormatted = expiry.toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
            
            await NotificationModel.create({
              user_id: userId,
              type: 'premium_expiring',
              title: 'Premium sắp hết hạn',
              message: `Gói Premium của bạn sẽ hết hạn sau ${daysUntilExpiry} ngày (${expiryFormatted}). Vui lòng gia hạn để tiếp tục sử dụng các tính năng premium.`,
              data: {
                expiry_date: expiryDate,
                days_remaining: daysUntilExpiry
              }
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          is_premium: isPremium,
          premium_expiry: expiryDate
        }
      });
    } catch (error) {
      console.error('Check premium status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Cancel premium subscription
  static async cancel(req, res) {
    try {
      const userId = req.user.user_id;

      const isPremium = await UserModel.isPremiumActive(userId);
      if (!isPremium) {
        return res.status(400).json({
          success: false,
          message: 'Bạn chưa có gói Premium đang hoạt động'
        });
      }

      let refundAmount = 0;
      let subscriptionTransaction = null;

      try {
        subscriptionTransaction = await TransactionModel.findLatestSubscription(userId);
        if (subscriptionTransaction) {
          const subscribedAt = new Date(subscriptionTransaction.created_at);
          const diffMs = Date.now() - subscribedAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) {
            refundAmount = Math.round((subscriptionTransaction.amount || 0) * 0.5);
          }
        }
      } catch (err) {
        console.error('Error checking subscription transaction for refund:', err);
      }

      const success = await UserModel.cancelPremium(userId);

      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to cancel premium'
        });
      }

      let refundTransactionId = null;
      if (refundAmount > 0) {
        await UserModel.addBalance(userId, refundAmount);
        refundTransactionId = await TransactionModel.create({
          user_id: userId,
          type: 'deposit',
          amount: refundAmount,
          status: 'completed',
          description: 'Hoàn 50% phí Premium do hủy trong 7 ngày'
        });
        if (subscriptionTransaction) {
          await TransactionModel.updateStatus(subscriptionTransaction.transaction_id, 'completed');
        }

        await NotificationModel.create({
          user_id: userId,
          type: 'system',
          title: 'Hoàn tiền Premium',
          message: `Bạn đã được hoàn ${refundAmount.toLocaleString('vi-VN')}đ (50% phí Premium) do hủy trong 7 ngày.`,
          data: {
            refund_transaction_id: refundTransactionId,
            refund_amount: refundAmount
          }
        });
      }

      res.json({
        success: true,
        message: refundAmount > 0
          ? 'Đã hủy Premium và hoàn 50% phí'
          : 'Đã hủy Premium. Gói không đủ điều kiện hoàn 50% do quá 7 ngày',
        data: {
          refund_amount: refundAmount,
          refund_transaction_id: refundTransactionId
        }
      });
    } catch (error) {
      console.error('Cancel premium error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Purchase a song
  static async purchaseSong(req, res) {
    try {
      const userId = req.user.user_id;
      const { song_id } = req.body;

      if (!song_id) {
        return res.status(400).json({
          success: false,
          message: 'Song ID is required'
        });
      }

      // Get song details
      const song = await SongModel.findById(song_id);
      if (!song) {
        return res.status(404).json({
          success: false,
          message: 'Song not found'
        });
      }

      // Check if song is premium
      if (!song.is_premium) {
        return res.status(400).json({
          success: false,
          message: 'This song is not a premium song'
        });
      }

      // Check if already purchased
      const alreadyPurchased = await PurchasedSongModel.hasPurchased(userId, song_id);
      if (alreadyPurchased) {
        return res.status(400).json({
          success: false,
          message: 'You have already purchased this song'
        });
      }

      const price = parseFloat(song.price) || 0;

      // Check user balance
      const balance = await UserModel.getBalance(userId);
      if (balance < price) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: {
            required: price,
            current_balance: balance,
            needed: price - balance
          }
        });
      }

      // Deduct balance
      const deductResult = await UserModel.subtractBalance(userId, price);
      if (!deductResult.success) {
        return res.status(400).json({
          success: false,
          message: deductResult.message
        });
      }

      // Purchase the song
      const purchaseId = await PurchasedSongModel.purchase(userId, song_id, price);

      if (!purchaseId) {
        // Rollback: add balance back if purchase failed
        await UserModel.addBalance(userId, price);
        return res.status(500).json({
          success: false,
          message: 'Failed to purchase song'
        });
      }

      // Create transaction record
      const transactionId = await TransactionModel.create({
        user_id: userId,
        type: 'purchase',
        amount: price,
        status: 'completed',
        description: `Mua bài hát: ${song.title}`
      });

      // ===== REVENUE SHARING: 70% artist, 30% platform =====
      const artistShare = price * 0.70;
      const platformShare = price * 0.30;

      // Only create revenue sharing if song has an artist
      if (song.artist_id) {
        // Create revenue sharing record
        await RevenueSharingModel.create({
          transaction_id: transactionId || null,
          purchase_id: purchaseId || null,
          artist_id: song.artist_id,
          user_id: userId,
          song_id: song_id,
          share_type: 'direct_purchase',
          total_amount: price,
          artist_share: artistShare,
          platform_share: platformShare,
          is_paid_to_artist: 1, // Direct purchase: trả ngay
        });

        // Add money to artist's user balance
        // Get artist's user_id
        const artist = await ArtistModel.findById(song.artist_id);
        if (artist && artist.user_id) {
          await UserModel.addBalance(artist.user_id, artistShare);
          
          // Create revenue transaction record
          await TransactionModel.create({
            user_id: artist.user_id,
            type: 'revenue',
            amount: artistShare,
            status: 'completed',
            description: `Doanh thu từ bài hát: ${song.title}`
          });

          // Create revenue notification for artist
          await NotificationModel.create({
            user_id: artist.user_id,
            type: 'revenue',
            title: 'Nhận lương từ bài hát',
            message: `Bạn đã nhận ${artistShare.toLocaleString('vi-VN')}đ từ việc bán bài hát "${song.title}" (70% doanh thu từ ${price.toLocaleString('vi-VN')}đ)`,
            data: {
              song_id: song_id,
              song_title: song.title,
              artist_id: song.artist_id,
              amount: artistShare,
              total_amount: price,
              share_type: 'direct_purchase',
              share_percentage: 70
            }
          });
        }
      } else {
        // If no artist, platform gets 100%
        await RevenueSharingModel.create({
          transaction_id: transactionId || null,
          purchase_id: purchaseId || null,
          artist_id: null,
          user_id: userId,
          song_id: song_id,
          share_type: 'direct_purchase',
          total_amount: price,
          artist_share: 0,
          platform_share: price, // Platform gets all if no artist
          is_paid_to_artist: 0,
        });
      }

      const newBalance = await UserModel.getBalance(userId);

      // Create spend notification for user
      await NotificationModel.create({
        user_id: userId,
        type: 'spend',
        title: 'Mua nhạc thành công',
        message: `Bạn đã mua bài hát "${song.title}" với giá ${price.toLocaleString('vi-VN')}đ. Bạn có thể nghe bài hát này bất cứ lúc nào.`,
        data: {
          transaction_id: transactionId,
          purchase_id: purchaseId,
          song_id: song_id,
          song_title: song.title,
          artist_id: song.artist_id,
          amount: price,
          new_balance: newBalance,
          type: 'purchase'
        }
      });

      res.json({
        success: true,
        message: 'Song purchased successfully',
        data: {
          purchase_id: purchaseId,
          song_id: song_id,
          price_paid: price,
          new_balance: newBalance
        }
      });
    } catch (error) {
      console.error('Purchase song error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Purchase an album
  static async purchaseAlbum(req, res) {
    try {
      const userId = req.user.user_id;
      const { album_id } = req.body;

      if (!album_id) {
        return res.status(400).json({
          success: false,
          message: 'Album ID is required'
        });
      }

      // Get album details
      const album = await AlbumModel.findById(album_id);
      if (!album) {
        return res.status(404).json({
          success: false,
          message: 'Album not found'
        });
      }

      // Check if album is premium
      if (!album.is_premium) {
        return res.status(400).json({
          success: false,
          message: 'This album is not a premium album'
        });
      }

      // Check if already purchased
      const alreadyPurchased = await PurchasedAlbumModel.hasPurchased(userId, album_id);
      if (alreadyPurchased) {
        return res.status(400).json({
          success: false,
          message: 'You have already purchased this album'
        });
      }

      const price = parseFloat(album.price) || 0;

      // Check user balance
      const balance = await UserModel.getBalance(userId);
      if (balance < price) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: {
            required: price,
            current_balance: balance,
            needed: price - balance
          }
        });
      }

      // Deduct balance
      const deductResult = await UserModel.subtractBalance(userId, price);
      if (!deductResult.success) {
        return res.status(400).json({
          success: false,
          message: deductResult.message
        });
      }

      // Purchase the album
      const purchaseId = await PurchasedAlbumModel.purchase(userId, album_id, price);

      if (!purchaseId) {
        // Rollback: add balance back if purchase failed
        await UserModel.addBalance(userId, price);
        return res.status(500).json({
          success: false,
          message: 'Failed to purchase album'
        });
      }

      // Create transaction record
      const transactionId = await TransactionModel.create({
        user_id: userId,
        type: 'purchase',
        amount: price,
        status: 'completed',
        description: `Mua album: ${album.title}`
      });

      // ===== REVENUE SHARING: 70% artist, 30% platform =====
      const artistShare = price * 0.70;
      const platformShare = price * 0.30;

      // Only create revenue sharing if album has an artist
      if (album.artist_id) {
        // Create revenue sharing record
        await RevenueSharingModel.create({
          transaction_id: transactionId || null,
          album_purchase_id: purchaseId || null,
          purchase_id: null,
          artist_id: album.artist_id,
          user_id: userId,
          song_id: null,
          album_id: album_id,
          share_type: 'album_purchase',
          total_amount: price,
          artist_share: artistShare,
          platform_share: platformShare,
          is_paid_to_artist: 1,
        });

        // Add money to artist's user balance
        const artist = await ArtistModel.findById(album.artist_id);
        if (artist && artist.user_id) {
          await UserModel.addBalance(artist.user_id, artistShare);
          
          // Create revenue transaction record
          await TransactionModel.create({
            user_id: artist.user_id,
            type: 'revenue',
            amount: artistShare,
            status: 'completed',
            description: `Doanh thu từ album: ${album.title}`
          });

          // Create revenue notification for artist
          await NotificationModel.create({
            user_id: artist.user_id,
            type: 'revenue',
            title: 'Nhận lương từ album',
            message: `Bạn đã nhận ${artistShare.toLocaleString('vi-VN')}đ từ việc bán album "${album.title}" (70% doanh thu từ ${price.toLocaleString('vi-VN')}đ)`,
            data: {
              album_id: album_id,
              album_title: album.title,
              artist_id: album.artist_id,
              amount: artistShare,
              total_amount: price,
              share_type: 'album_purchase',
              share_percentage: 70
            }
          });
        }
      } else {
        // Platform gets 100%
         await RevenueSharingModel.create({
          transaction_id: transactionId || null,
          album_purchase_id: purchaseId || null,
          purchase_id: null,
          artist_id: null,
          user_id: userId,
          song_id: null,
          share_type: 'direct_purchase',
          total_amount: price,
          artist_share: 0,
          platform_share: price,
          is_paid_to_artist: 0,
        });
      }

      const newBalance = await UserModel.getBalance(userId);

      // Create spend notification for user
      await NotificationModel.create({
        user_id: userId,
        type: 'spend',
        title: 'Mua album thành công',
        message: `Bạn đã mua album "${album.title}" với giá ${price.toLocaleString('vi-VN')}đ. Bạn có thể nghe tất cả bài hát trong album này.`,
        data: {
          transaction_id: transactionId,
          purchase_id: purchaseId,
          album_id: album_id,
          album_title: album.title,
          artist_id: album.artist_id,
          amount: price,
          new_balance: newBalance,
          type: 'album_purchase'
        }
      });

      res.json({
        success: true,
        message: 'Album purchased successfully',
        data: {
          purchase_id: purchaseId,
          album_id: album_id,
          price_paid: price,
          new_balance: newBalance
        }
      });
    } catch (error) {
      console.error('Purchase album error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get purchased songs
  static async getPurchasedSongs(req, res) {
    try {
      const userId = req.user.user_id;
      
      const songs = await PurchasedSongModel.findByUser(userId);

      res.json({
        success: true,
        data: songs
      });
    } catch (error) {
      console.error('Get purchased songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get purchased albums
  static async getPurchasedAlbums(req, res) {
    try {
      const userId = req.user.user_id;
      
      const albums = await PurchasedAlbumModel.findByUser(userId);

      res.json({
        success: true,
        data: albums
      });
    } catch (error) {
      console.error('Get purchased albums error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get purchase history
  static async getPurchaseHistory(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0 } = req.query;

      const history = await PurchasedSongModel.getPurchaseHistory(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('Get purchase history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Check access to a specific song
  static async checkSongAccess(req, res) {
    try {
      const userId = req.user.user_id;
      const { id } = req.params;

      const accessInfo = await SongModel.checkAccess(id, userId);

      res.json({
        success: true,
        data: accessInfo
      });
    } catch (error) {
      console.error('Check song access error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all premium songs
  static async getPremiumSongs(req, res) {
    try {
      const { limit = 20, offset = 0 } = req.query;
      
      const songs = await SongModel.findPremium(parseInt(limit), parseInt(offset));

      res.json({
        success: true,
        data: songs,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      });
    } catch (error) {
      console.error('Get premium songs error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get total spent by user
  static async getTotalSpent(req, res) {
    try {
      const userId = req.user.user_id;
      
      const totalSpent = await PurchasedSongModel.getTotalSpent(userId);

      res.json({
        success: true,
        data: {
          total_spent: totalSpent
        }
      });
    } catch (error) {
      console.error('Get total spent error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = PremiumController;

