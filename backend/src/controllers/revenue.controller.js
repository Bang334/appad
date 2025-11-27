const RevenueSharingModel = require('../models/revenue-sharing.model');
const HistoryModel = require('../models/history.model');
const ArtistModel = require('../models/artist.model');
const UserModel = require('../models/user.model');
const TransactionModel = require('../models/transaction.model');

class RevenueController {
  // Calculate monthly premium revenue (Admin job)
  static async calculateMonthlyRevenue(req, res) {
    try {
      const { year, month } = req.body;
      
      if (!year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Year and month are required'
        });
      }

      const period = `${year}-${String(month).padStart(2, '0')}`;
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${lastDay}`;

      // Get all premium subscriptions in this period
      const [subscriptions] = await require('../config/database').execute(
        `SELECT SUM(amount) as total_revenue
         FROM transactions
         WHERE type = 'subscription' 
         AND status = 'completed'
         AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
        [period]
      );

      const totalRevenue = parseFloat(subscriptions[0]?.total_revenue || 0);
      
      if (totalRevenue === 0) {
        return res.json({
          success: true,
          message: 'No premium revenue in this period',
          data: { period, total_revenue: 0, artist_pool: 0, platform_pool: 0 }
        });
      }

      // Calculate pools
      const artistPool = totalRevenue * 0.70;
      const platformPool = totalRevenue * 0.30;

      // Get streaming stats for the period
      const streamStats = await HistoryModel.getTotalStreamsByPeriod(startDate, endDate);
      
      const totalStreams = streamStats.reduce((sum, stat) => sum + parseInt(stat.total_streams), 0);
      
      if (totalStreams === 0) {
        return res.json({
          success: true,
          message: 'No streams in this period',
          data: { period, total_revenue: totalRevenue, streams: 0 }
        });
      }

      // Calculate revenue for each artist
      const revenueShares = [];
      for (const stat of streamStats) {
        const artistStreams = parseInt(stat.total_streams);
        const artistPercentage = (artistStreams / totalStreams) * 100;
        const artistRevenue = (artistPool * artistStreams) / totalStreams;

        revenueShares.push({
          artist_id: stat.artist_id,
          streams: artistStreams,
          percentage: artistPercentage.toFixed(2),
          revenue: artistRevenue.toFixed(2)
        });
      }

      res.json({
        success: true,
        message: 'Revenue calculated successfully',
        data: {
          period,
          total_revenue: totalRevenue,
          artist_pool: artistPool,
          platform_pool: platformPool,
          total_streams: totalStreams,
          artist_shares: revenueShares
        }
      });
    } catch (error) {
      console.error('Calculate monthly revenue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Apply calculated revenue (create revenue_sharing records and update artist balances)
  static async applyMonthlyRevenue(req, res) {
    try {
      const { year, month, artist_shares } = req.body;

      if (!year || !month || !artist_shares || !Array.isArray(artist_shares)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data'
        });
      }

      const period = `${year}-${String(month).padStart(2, '0')}`;
      let successCount = 0;
      let errorCount = 0;

      for (const share of artist_shares) {
        try {
          const { artist_id, streams, revenue } = share;
          const revenueAmount = parseFloat(revenue);

          // Create revenue sharing record
          await RevenueSharingModel.create({
            artist_id,
            user_id: 0, // Multiple users, not specific
            share_type: 'premium_stream',
            total_amount: revenueAmount / 0.70, // Reverse calculate
            artist_share: revenueAmount,
            platform_share: (revenueAmount / 0.70) * 0.30,
            calculation_period: period,
            stream_count: streams,
            is_paid_to_artist: 0, // Waiting for admin approval
          });

          successCount++;
        } catch (error) {
          console.error(`Error processing artist ${share.artist_id}:`, error);
          errorCount++;
        }
      }

      res.json({
        success: true,
        message: 'Revenue applied successfully',
        data: {
          period,
          success_count: successCount,
          error_count: errorCount
        }
      });
    } catch (error) {
      console.error('Apply monthly revenue error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Pay artists (mark as paid and add to balance)
  static async payArtists(req, res) {
    try {
      const { sharing_ids, artist_id } = req.body;

      if (!sharing_ids || !Array.isArray(sharing_ids) || !artist_id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request data'
        });
      }

      // Get revenue sharing records
      const db = require('../config/database');
      const placeholders = sharing_ids.map(() => '?').join(',');
      const [records] = await db.execute(
        `SELECT sharing_id, artist_id, artist_share, calculation_period, stream_count
         FROM revenue_sharing
         WHERE sharing_id IN (${placeholders}) 
         AND artist_id = ?
         AND is_paid_to_artist = 0`,
        [...sharing_ids, artist_id]
      );

      if (records.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No unpaid records found'
        });
      }

      // Calculate total amount
      const totalAmount = records.reduce((sum, r) => sum + parseFloat(r.artist_share), 0);

      // Get artist's user_id
      const artist = await ArtistModel.findById(artist_id);
      if (!artist || !artist.user_id) {
        return res.status(404).json({
          success: false,
          message: 'Artist user not found'
        });
      }

      // Add to artist's user balance
      await UserModel.addBalance(artist.user_id, totalAmount);
      
      // Create revenue transaction record
      await TransactionModel.create({
        user_id: artist.user_id,
        type: 'revenue',
        amount: totalAmount,
        status: 'completed',
        description: `Doanh thu premium stream - ${records.length} records`
      });

      // Get calculation period and total streams from records
      const period = records[0]?.calculation_period || 'N/A';
      const totalStreams = records.reduce((sum, r) => sum + (parseInt(r.stream_count) || 0), 0);

      // Create revenue notification for artist
      const NotificationModel = require('../models/notification.model');
      await NotificationModel.create({
        user_id: artist.user_id,
        type: 'revenue',
        title: 'Nhận lương từ Premium',
        message: `Bạn đã nhận ${totalAmount.toLocaleString('vi-VN')}đ từ doanh thu Premium tháng ${period} (${records.length} records, ${totalStreams} streams)`,
        data: {
          artist_id: artist_id,
          amount: totalAmount,
          records_count: records.length,
          stream_count: totalStreams,
          period: period,
          share_type: 'premium_stream',
          sharing_ids: sharing_ids
        }
      });

      // Mark as paid
      const paidCount = await RevenueSharingModel.markAsPaid(sharing_ids, artist_id);

      res.json({
        success: true,
        message: `Paid ${paidCount} records`,
        data: {
          artist_id,
          amount_paid: totalAmount,
          records_paid: paidCount
        }
      });
    } catch (error) {
      console.error('Pay artists error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get platform revenue stats
  static async getPlatformStats(req, res) {
    try {
      const { start_date, end_date } = req.query;

      const stats = {
        total_revenue: await RevenueSharingModel.getTotalPlatformRevenue({
          startDate: start_date,
          endDate: end_date
        }),
        direct_purchase: await RevenueSharingModel.getTotalPlatformRevenue({
          startDate: start_date,
          endDate: end_date,
          shareType: 'direct_purchase'
        }),
        premium_stream: await RevenueSharingModel.getTotalPlatformRevenue({
          startDate: start_date,
          endDate: end_date,
          shareType: 'premium_stream'
        })
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get platform stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = RevenueController;

