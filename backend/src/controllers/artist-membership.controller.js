const ArtistMembershipModel = require('../models/artist-membership.model');
const ArtistModel = require('../models/artist.model');
const UserModel = require('../models/user.model');
const TransactionModel = require('../models/transaction.model');
const RevenueSharingModel = require('../models/revenue-sharing.model');
const NotificationModel = require('../models/notification.model');

class ArtistMembershipController {
  // Subscribe to artist membership
  static async subscribe(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.params;
      const { duration_days } = req.body;

      // Get artist info and membership price
      const artist = await ArtistModel.findById(artist_id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      // Get membership info (price and default duration)
      const membershipInfo = await ArtistModel.getMembershipInfo(artist_id);
      const membershipPrice = membershipInfo.membership_price || 0;
      const membershipDuration = duration_days || membershipInfo.membership_duration_days || 30;

      if (membershipPrice <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Artist has not set membership price yet'
        });
      }

      // Check if user already has active membership
      const existingMembership = await ArtistMembershipModel.findByUserAndArtist(userId, artist_id);
      if (existingMembership && existingMembership.status === 'active' && new Date(existingMembership.expiry_date) > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active membership for this artist',
          data: {
            expiry_date: existingMembership.expiry_date
          }
        });
      }

      // Check user balance
      const balance = await UserModel.getBalance(userId);
      // Ensure both are numbers for comparison
      const balanceNum = parseFloat(balance) || 0;
      const priceNum = parseFloat(membershipPrice) || 0;
      
      console.log('[Membership Subscribe] Balance check:', {
        userId,
        artist_id,
        balance: balance,
        balanceNum: balanceNum,
        membershipPrice: membershipPrice,
        priceNum: priceNum,
        comparison: balanceNum < priceNum
      });
      
      if (balanceNum < priceNum) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          data: {
            required: priceNum,
            current_balance: balanceNum,
            needed: priceNum - balanceNum
          }
        });
      }

      // Deduct balance (use parsed price)
      const deductResult = await UserModel.subtractBalance(userId, priceNum);
      if (!deductResult.success) {
        return res.status(400).json({
          success: false,
          message: deductResult.message
        });
      }

      // Create membership (use parsed price)
      const membershipId = await ArtistMembershipModel.create({
        user_id: userId,
        artist_id: parseInt(artist_id),
        price_paid: priceNum,
        duration_days: membershipDuration
      });

      if (!membershipId) {
        // Rollback: add balance back if membership creation failed (use parsed price)
        await UserModel.addBalance(userId, priceNum);
        return res.status(500).json({
          success: false,
          message: 'Failed to create membership'
        });
      }

      // Create transaction record (use parsed price)
      const transactionId = await TransactionModel.create({
        user_id: userId,
        type: 'subscription',
        amount: priceNum,
        status: 'completed',
        description: `Đăng ký hội viên ${artist.name} - ${membershipDuration} ngày`
      });

      // Calculate revenue sharing (70% artist, 30% platform) - use parsed price
      const artistShare = Math.round(priceNum * 0.7);
      const platformShare = priceNum - artistShare;

      // Add revenue to artist wallet
      await UserModel.addBalance(artist.user_id, artistShare);

      // Record revenue sharing (use parsed price)
      await RevenueSharingModel.create({
        transaction_id: transactionId,
        artist_id: parseInt(artist_id),
        user_id: userId,
        share_type: 'artist_membership',
        total_amount: priceNum,
        artist_share: artistShare,
        artist_percentage: 70,
        platform_share: platformShare,
        platform_percentage: 30
      });

      // Get updated user info
      const newBalance = await UserModel.getBalance(userId);
      const newBalanceNum = parseFloat(newBalance) || 0;
      const membership = await ArtistMembershipModel.findByUserAndArtist(userId, artist_id);
      
      console.log('[Membership Subscribe] Success:', {
        userId,
        artist_id,
        membershipId,
        pricePaid: priceNum,
        newBalance: newBalanceNum
      });

      // Create notification for user (use parsed price)
      await NotificationModel.create({
        user_id: userId,
        type: 'spend',
        title: 'Đăng ký hội viên thành công',
        message: `Bạn đã đăng ký hội viên ${artist.name} ${membershipDuration} ngày với giá ${priceNum.toLocaleString('vi-VN')}đ. Hội viên sẽ hết hạn vào ${new Date(membership.expiry_date).toLocaleDateString('vi-VN')}`,
        data: {
          transaction_id: transactionId,
          membership_id: membershipId,
          artist_id: artist_id,
          artist_name: artist.name,
          amount: priceNum,
          duration_days: membershipDuration,
          expiry_date: membership.expiry_date,
          new_balance: newBalanceNum,
          type: 'artist_membership'
        }
      });

      // Create notification for artist
      await NotificationModel.create({
        user_id: artist.user_id,
        type: 'revenue',
        title: 'Có hội viên mới',
        message: `Bạn có thêm 1 hội viên mới. Doanh thu: ${artistShare.toLocaleString('vi-VN')}đ`,
        data: {
          transaction_id: transactionId,
          membership_id: membershipId,
          artist_id: artist_id,
          amount: artistShare,
          type: 'artist_membership'
        }
      });

      res.json({
        success: true,
        message: 'Successfully subscribed to artist membership',
        data: {
          membership_id: membershipId,
          artist_id: parseInt(artist_id),
          artist_name: artist.name,
          price_paid: priceNum,
          duration_days: membershipDuration,
          expiry_date: membership.expiry_date,
          new_balance: newBalanceNum
        }
      });
    } catch (error) {
      console.error('Subscribe artist membership error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Check membership status
  static async getStatus(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.params;

      const membership = await ArtistMembershipModel.findByUserAndArtist(userId, artist_id);
      const artist = await ArtistModel.findById(artist_id);
      const membershipInfo = await ArtistModel.getMembershipInfo(artist_id);

      res.json({
        success: true,
        data: {
          has_membership: membership !== null,
          membership: membership,
          artist: artist ? {
            artist_id: artist.artist_id,
            name: artist.name
          } : null,
          membership_info: {
            price: membershipInfo.membership_price,
            duration_days: membershipInfo.membership_duration_days
          }
        }
      });
    } catch (error) {
      console.error('Get membership status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Cancel membership
  static async cancel(req, res) {
    try {
      const userId = req.user.user_id;
      const { artist_id } = req.params;

      const cancelled = await ArtistMembershipModel.cancel(userId, artist_id);
      
      if (!cancelled) {
        return res.status(404).json({
          success: false,
          message: 'No active membership found to cancel'
        });
      }

      res.json({
        success: true,
        message: 'Membership cancelled successfully'
      });
    } catch (error) {
      console.error('Cancel membership error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all memberships for current user (active only)
  static async getMyMemberships(req, res) {
    try {
      const userId = req.user.user_id;

      const memberships = await ArtistMembershipModel.findByUser(userId);

      res.json({
        success: true,
        data: memberships
      });
    } catch (error) {
      console.error('Get my memberships error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all memberships history for current user (including expired/cancelled)
  static async getMyMembershipsHistory(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0 } = req.query;

      const memberships = await ArtistMembershipModel.findByUserAll(userId, limit, offset);
      const activeCount = await ArtistMembershipModel.getActiveCountByUser(userId);

      // Separate active and history
      const active = memberships.filter(m => m.status === 'active' && new Date(m.expiry_date) > new Date());
      const history = memberships.filter(m => !(m.status === 'active' && new Date(m.expiry_date) > new Date()));

      res.json({
        success: true,
        data: {
          active,
          history,
          active_count: activeCount,
          total: memberships.length
        }
      });
    } catch (error) {
      console.error('Get my memberships history error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all members for an artist (artist dashboard)
  static async getMembers(req, res) {
    try {
      const { artist_id } = req.params;
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;

      // Verify artist exists
      const artist = await ArtistModel.findById(artist_id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      const members = await ArtistMembershipModel.findByArtist(artist_id, limit, offset);
      const stats = await ArtistMembershipModel.getStats(artist_id);

      res.json({
        success: true,
        data: {
          members,
          stats
        }
      });
    } catch (error) {
      console.error('Get members error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update membership price (artist only)
  static async updateMembershipPrice(req, res) {
    try {
      const { artist_id } = req.params;
      const { membership_price, membership_duration_days } = req.body;

      // Verify artist exists
      const artist = await ArtistModel.findById(artist_id);
      if (!artist) {
        return res.status(404).json({
          success: false,
          message: 'Artist not found'
        });
      }

      if (membership_price !== undefined && membership_price < 0) {
        return res.status(400).json({
          success: false,
          message: 'Membership price must be >= 0'
        });
      }

      if (membership_duration_days !== undefined && membership_duration_days < 1) {
        return res.status(400).json({
          success: false,
          message: 'Membership duration must be >= 1 day'
        });
      }

      const updated = await ArtistModel.updateMembershipInfo(artist_id, {
        membership_price: membership_price,
        membership_duration_days: membership_duration_days
      });

      if (!updated) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update membership info'
        });
      }

      const membershipInfo = await ArtistModel.getMembershipInfo(artist_id);

      res.json({
        success: true,
        message: 'Membership info updated successfully',
        data: membershipInfo
      });
    } catch (error) {
      console.error('Update membership price error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ArtistMembershipController;

