const RevenueSharingModel = require('../models/revenue-sharing.model');
const HistoryModel = require('../models/history.model');
const ArtistModel = require('../models/artist.model');
const UserModel = require('../models/user.model');
const TransactionModel = require('../models/transaction.model');

class RevenueController {
  // Calculate/Preview Premium Payout (Admin job)
  static async calculateMonthlyRevenue(req, res) {
    try {
      const db = require('../config/database');

      // 1. Find the last payout date (latest premium_stream record)
      const [lastPayout] = await db.execute(
        `SELECT created_at FROM revenue_sharing 
         WHERE share_type = 'premium_stream' 
         ORDER BY created_at DESC LIMIT 1`
      );

      // Default start date if no payout ever made: 30 days ago
      let startDate;
      if (lastPayout.length > 0) {
        startDate = new Date(lastPayout[0].created_at);
        // Add 1 second to avoid overlapping with exact last record
        startDate.setSeconds(startDate.getSeconds() + 1);
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      }

      const endDate = new Date(); // Right now

      // Force Vietnam Time for SQL comparison to match HistoryModel.add
      const formatVN = (date) => {
        const vnDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
        const y = vnDate.getFullYear();
        const m = String(vnDate.getMonth() + 1).padStart(2, '0');
        const d = String(vnDate.getDate()).padStart(2, '0');
        const h = String(vnDate.getHours()).padStart(2, '0');
        const i = String(vnDate.getMinutes()).padStart(2, '0');
        const s = String(vnDate.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${d} ${h}:${i}:${s}`;
      };

      const startSql = formatVN(startDate);
      const endSql = formatVN(endDate);

      // 2. Get total pool from premium_subscription in this period
      const [poolResult] = await db.execute(
        `SELECT SUM(artist_share) as total_pool
         FROM revenue_sharing
         WHERE share_type = 'premium_subscription' 
         AND created_at BETWEEN ? AND ?`,
        [startSql, endSql]
      );

      const totalPool = parseFloat(poolResult[0]?.total_pool || 0);
      
      if (totalPool === 0) {
        return res.json({
          success: true,
          message: 'Không có doanh thu Premium mới để phát lương',
          data: { start_date: startSql, end_date: endSql, total_pool: 0, total_duration: 0, artist_shares: [] }
        });
      }

      // 3. Get streaming stats from listening_history for the period
      const streamStats = await HistoryModel.getTotalStreamsByPeriod(startSql, endSql);
      
      // Calculate total duration across all artists
      const totalDuration = streamStats.reduce((sum, stat) => sum + parseInt(stat.total_duration || 0), 0);
      
      if (totalDuration === 0) {
        return res.json({
          success: true,
          message: 'Không có lượt nghe nào trong khoảng thời gian này',
          data: { start_date: startSql, end_date: endSql, total_pool: totalPool, total_duration: 0, artist_shares: [] }
        });
      }

      // 4. Calculate revenue for each artist based on DURATION
      const artistShares = [];
      for (const stat of streamStats) {
        const artistDuration = parseInt(stat.total_duration || 0);
        if (artistDuration <= 0) continue;

        const artistPercentage = (artistDuration / totalDuration) * 100;
        const artistRevenue = (totalPool * artistDuration) / totalDuration;

        const artist = await ArtistModel.findById(stat.artist_id);

        artistShares.push({
          artist_id: stat.artist_id,
          artist_name: artist ? artist.name : 'Unknown Artist',
          streams: parseInt(stat.total_completed || 0),
          duration: artistDuration, // Total duration in seconds
          percentage: artistPercentage.toFixed(2),
          revenue: Math.floor(artistRevenue) // Round down for VND
        });
      }

      // Sort by revenue descending
      artistShares.sort((a, b) => b.revenue - a.revenue);

      res.json({
        success: true,
        data: {
          start_date: startSql,
          end_date: endSql,
          total_pool: totalPool,
          total_duration: totalDuration,
          artist_shares: artistShares
        }
      });
    } catch (error) {
      console.error('Calculate payout error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Execute Payout (Apply and pay to balances)
  static async applyMonthlyRevenue(req, res) {
    const db = require('../config/database');
    const conn = await db.getConnection(); // Use dedicated connection for transaction

    try {
      const { start_date, end_date, artist_shares } = req.body;

      if (!artist_shares || !Array.isArray(artist_shares)) {
        return res.status(400).json({
          success: false,
          message: 'Dữ liệu phát lương không hợp lệ'
        });
      }

      let successCount = 0;
      let totalPaid = 0;

      for (const share of artist_shares) {
        try {
          const { artist_id, revenue, streams, duration } = share;
          const revenueAmount = parseFloat(revenue);

          if (revenueAmount <= 0) continue;

          const artist = await ArtistModel.findById(artist_id);
          if (!artist || !artist.user_id) {
            console.warn(`[Payout] Artist ${artist_id} has no linked user_id. Skipping.`);
            continue;
          }

          // Start Transaction for this artist
          await conn.beginTransaction();

          // 1. Format duration for description
          const hours = Math.floor(duration / 3600);
          const mins = Math.floor((duration % 3600) / 60);
          const secs = duration % 60;
          const durationStr = hours > 0 
            ? `${hours} giờ ${mins} phút ${secs} giây` 
            : mins > 0 ? `${mins} phút ${secs} giây` : `${secs} giây`;

          const description = `Lương Premium (${start_date} - ${end_date}): ${streams} lượt nghe, ${durationStr}`;

          // 2. Create Transaction record (using conn to keep context if possible, 
          // or just direct SQL to ensure it's in the transaction)
          const [tResult] = await conn.execute(
            `INSERT INTO transactions (user_id, type, amount, status, description) 
             VALUES (?, 'revenue', ?, 'completed', ?)`,
            [artist.user_id, revenueAmount, description]
          );
          const transactionId = tResult.insertId;

          // 3. Create Revenue Sharing record
          await conn.execute(
            `INSERT INTO revenue_sharing (transaction_id, artist_id, user_id, share_type, total_amount, artist_share, platform_share, artist_percentage)
             VALUES (?, ?, 1, 'premium_stream', ?, ?, 0, 100.00)`,
            [transactionId, artist_id, revenueAmount, revenueAmount]
          );

          // 4. Update Artist Wallet Balance
          await conn.execute(
            'UPDATE users SET balance = balance + ? WHERE user_id = ?',
            [revenueAmount, artist.user_id]
          );

          // Commit everything for this artist
          await conn.commit();

          // 5. Send Notification (outside transaction is fine, or after commit)
          try {
            const NotificationModel = require('../models/notification.model');
            await NotificationModel.create({
              user_id: artist.user_id,
              type: 'revenue',
              title: 'Lương Premium đã về ví! 💰',
              message: `Bạn nhận được ${revenueAmount.toLocaleString('vi-VN')}đ từ quỹ Premium.\n📊 Thời gian nghe: ${durationStr}\n📅 Kỳ thanh toán: ${start_date} đến ${end_date}`,
              data: {
                artist_id,
                amount: revenueAmount,
                duration,
                start_date,
                end_date,
                share_type: 'premium_stream'
              }
            });
          } catch (notifErr) {
            console.error(`[Payout] Failed to send notification to artist ${artist_id}:`, notifErr);
            // Don't fail the whole payout if just notification fails
          }

          successCount++;
          totalPaid += revenueAmount;

        } catch (error) {
          await conn.rollback();
          console.error(`[Payout] Error paying artist ${share.artist_id}:`, error);
        }
      }

      res.json({
        success: true,
        message: 'Cấp phát lương thành công',
        data: {
          success_count: successCount,
          total_paid: totalPaid,
          period: `${start_date} to ${end_date}`
        }
      });
    } catch (error) {
      console.error('Apply payout main error:', error);
      res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống khi xử lý phát lương'
      });
    } finally {
      conn.release(); // IMPORTANT: Release connection back to pool
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
        `SELECT sharing_id, artist_id, artist_share, platform_share, share_type, created_at
         FROM revenue_sharing
         WHERE sharing_id IN (${placeholders}) 
         AND artist_id = ?`,
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
      const totalPlatformAmount = records.reduce((sum, r) => sum + parseFloat(r.platform_share || 0), 0);

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

      // Add to admins' balance
      const admins = await UserModel.findAdmins();
      if (admins.length > 0 && totalPlatformAmount > 0) {
        const sharePerAdmin = totalPlatformAmount / admins.length;
        for (const admin of admins) {
          await UserModel.addBalance(admin.user_id, sharePerAdmin);
          await TransactionModel.create({
            user_id: admin.user_id,
            type: 'revenue',
            amount: sharePerAdmin,
            status: 'completed',
            description: `Phí nền tảng Premium (từ nghệ sĩ: ${artist.name})`
          });
        }
      }

      // Calculate stats for premium stream if present
      let statsDetail = '';
      const premiumRecords = records.filter(r => r.share_type === 'premium_stream');
      
      if (premiumRecords.length > 0) {
        // Lấy record đầu tiên để đoán tháng (Job chạy mùng 1 nên tháng tính lương là tháng trước)
        const date = new Date(premiumRecords[0].created_at);
        const pYear = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
        const pMonth = date.getMonth() === 0 ? 12 : date.getMonth();
        
        const startDate = `${pYear}-${String(pMonth).padStart(2, '0')}-01 00:00:00`;
        const endDate = `${pYear}-${String(pMonth).padStart(2, '0')}-${new Date(pYear, pMonth, 0).getDate()} 23:59:59`;
        
        const stats = await HistoryModel.getArtistSummaryByPeriod(artist_id, startDate, endDate);
        if (stats && stats.total_streams > 0) {
          const hours = Math.floor(stats.total_duration / 3600);
          const mins = Math.floor((stats.total_duration % 3600) / 60);
          const durationStr = hours > 0 ? `${hours} giờ ${mins} phút` : `${mins} phút`;
          
          statsDetail = `\n\n📊 Thống kê Premium tháng ${pMonth}/${pYear}:\n` +
                        `• Tổng lượt nghe: ${stats.total_streams.toLocaleString('vi-VN')}\n` +
                        `• Nghe hoàn tất: ${stats.total_completed.toLocaleString('vi-VN')}\n` +
                        `• Tổng thời gian: ${durationStr}\n` +
                        `• Người nghe: ${stats.unique_listeners.toLocaleString('vi-VN')}`;
        }
      }

      // Create revenue notification for artist
      const NotificationModel = require('../models/notification.model');
      await NotificationModel.create({
        user_id: artist.user_id,
        type: 'revenue',
        title: 'Lương Premium đã về ví! 💰',
        message: `Bạn vừa nhận được ${totalAmount.toLocaleString('vi-VN')}đ từ doanh thu Premium.${statsDetail}\n\nChúc mừng bạn! Hãy tiếp tục ra mắt những sản phẩm chất lượng nhé.`,
        data: {
          artist_id: artist_id,
          amount: totalAmount,
          records_count: records.length,
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

  // Get Payout History for Admin (Batches)
  static async getPayoutHistory(req, res) {
    try {
      const db = require('../config/database');
      
      // Grouping by minute to treat records created close together as one batch
      const [rows] = await db.execute(
        `SELECT 
          DATE_FORMAT(rs.created_at, '%Y-%m-%d %H:%i') as batch_time,
          MIN(rs.created_at) as actual_time,
          SUM(rs.artist_share) as total_paid,
          COUNT(DISTINCT rs.artist_id) as artist_count,
          SUBSTRING_INDEX(GROUP_CONCAT(DISTINCT t.description), ',', 1) as sample_description
         FROM revenue_sharing rs
         LEFT JOIN transactions t ON rs.transaction_id = t.transaction_id
         WHERE rs.share_type = 'premium_stream'
         GROUP BY batch_time
         ORDER BY actual_time DESC`
      );

      res.json({
        success: true,
        data: rows
      });
    } catch (error) {
      console.error('Get payout history error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Detailed Payouts for a specific Batch (Admin)
  static async getPayoutBatchDetails(req, res) {
    try {
      const { batch_time } = req.query; // format: 'YYYY-MM-DD HH:mm'
      const db = require('../config/database');
      
      // Get detailed records for this batch
      const [rows] = await db.execute(
        `SELECT rs.sharing_id, rs.artist_id, rs.artist_share, rs.created_at,
                a.name as artist_name, a.image_url,
                t.description, t.amount as transaction_amount
         FROM revenue_sharing rs
         LEFT JOIN artists a ON rs.artist_id = a.artist_id
         LEFT JOIN transactions t ON rs.transaction_id = t.transaction_id
         WHERE rs.share_type = 'premium_stream'
         AND DATE_FORMAT(rs.created_at, '%Y-%m-%d %H:%i') = ?
         ORDER BY rs.artist_share DESC`,
        [batch_time]
      );

      // Parse additional info from the first record's description
      let batchSummary = {
        period_start: null,
        period_end: null,
        total_streams: 0,
        total_duration_text: '',
      };

      if (rows.length > 0 && rows[0].description) {
        // Parse description like: "Lương Premium (2025-11-30 ... - 2025-12-30 ...): 120 lượt nghe, 2 giờ 30 phút"
        const desc = rows[0].description;
        
        // Extract period dates
        const periodMatch = desc.match(/\(([^)]+)\)/);
        if (periodMatch) {
          const periodParts = periodMatch[1].split(' - ');
          if (periodParts.length === 2) {
            batchSummary.period_start = periodParts[0].trim();
            batchSummary.period_end = periodParts[1].trim();
          }
        }

        // Extract streams count
        const streamsMatch = desc.match(/(\d+)\s*lượt nghe/);
        if (streamsMatch) {
          batchSummary.total_streams = parseInt(streamsMatch[1]);
        }

        // Extract duration text
        const durationMatch = desc.match(/lượt nghe,\s*(.+)$/);
        if (durationMatch) {
          batchSummary.total_duration_text = durationMatch[1].trim();
        }
      }

      // Calculate batch totals
      const totalPaid = rows.reduce((sum, r) => sum + parseFloat(r.artist_share || 0), 0);

      // Parse each artist's stats from their description
      const artistsWithStats = rows.map(r => {
        let streams = 0;
        let durationText = '';
        
        if (r.description) {
          // Parse: "Lương Premium (...): 120 lượt nghe, 2 giờ 30 phút 15 giây"
          // Flexible regex to catch "X lượt nghe"
          const streamsMatch = r.description.match(/(\d+)\s*lượt nghe/);
          if (streamsMatch) {
            streams = parseInt(streamsMatch[1]);
          }
          
          // Flexible regex to catch everything after "lượt nghe, "
          const durationMatch = r.description.match(/lượt nghe,\s*(.+)$/);
          if (durationMatch) {
            durationText = durationMatch[1].trim();
          }
        }

        const amount = parseFloat(r.artist_share);
        const percentage = totalPaid > 0 ? ((amount / totalPaid) * 100).toFixed(2) : 0;

        return {
          artist_id: r.artist_id,
          artist_name: r.artist_name || 'Unknown Artist',
          image_url: r.image_url,
          amount,
          percentage,
          streams,
          duration_text: durationText || '0s',
          paid_at: r.created_at,
        };
      });

      res.json({
        success: true,
        data: {
          batch_time,
          total_paid: totalPaid,
          artist_count: rows.length,
          period_start: batchSummary.period_start,
          period_end: batchSummary.period_end,
          artists: artistsWithStats
        }
      });
    } catch (error) {
      console.error('Get batch details error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }

  // Get Payout History for Logged-in Artist
  static async getArtistPayoutHistory(req, res) {
    try {
      const { artist_id } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const results = await RevenueSharingModel.findByArtist(artist_id, {
        limit,
        offset,
        shareType: 'premium_stream'
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Get artist payout history error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
}

module.exports = RevenueController;

