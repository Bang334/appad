const RevenueSharingModel = require('../models/revenue-sharing.model');
const HistoryModel = require('../models/history.model');
const db = require('../config/database');

/**
 * Monthly Revenue Calculation Job
 * Chạy tự động vào 1h sáng ngày đầu tiên của mỗi tháng
 * Tính toán và tạo revenue_sharing records cho tháng trước
 */
class MonthlyRevenueJob {
  /**
   * Tính toán và áp dụng revenue cho tháng trước
   */
  static async processLastMonth() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = lastMonth.getFullYear();
      const month = lastMonth.getMonth() + 1;

      console.log(`[Monthly Revenue Job] Processing revenue for ${year}-${String(month).padStart(2, '0')}`);

      const period = `${year}-${String(month).padStart(2, '0')}`;
      const startDate = `${period}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${period}-${lastDay}`;

      // Step 1: Get total premium revenue for the period
      const [subscriptions] = await db.execute(
        `SELECT SUM(amount) as total_revenue
         FROM transactions
         WHERE type = 'subscription' 
         AND status = 'completed'
         AND DATE_FORMAT(created_at, '%Y-%m') = ?`,
        [period]
      );

      const totalRevenue = parseFloat(subscriptions[0]?.total_revenue || 0);
      
      if (totalRevenue === 0) {
        console.log(`[Monthly Revenue Job] No revenue to process for ${year}-${month}`);
        return { success: true, message: 'No revenue to process' };
      }

      // Calculate pools
      const artistPool = totalRevenue * 0.70;
      const platformPool = totalRevenue * 0.30;

      // Step 2: Get streaming stats for the period
      const streamStats = await HistoryModel.getTotalStreamsByPeriod(startDate, endDate);
      const totalStreams = streamStats.reduce((sum, stat) => sum + (stat.total_streams || 0), 0);

      if (totalStreams === 0) {
        console.log(`[Monthly Revenue Job] No streams to process for ${year}-${month}`);
        return { success: true, message: 'No streams to process' };
      }

      // Step 3: Calculate revenue per artist
      const artistShares = streamStats.map(stat => {
        const artistStreams = stat.total_streams || 0;
        const revenue = (artistStreams / totalStreams) * artistPool;
        return {
          artist_id: stat.artist_id,
          streams: artistStreams,
          revenue: revenue
        };
      });

      // Step 4: Create revenue_sharing records
      let successCount = 0;
      let errorCount = 0;

      for (const share of artistShares) {
        try {
          const { artist_id, streams, revenue } = share;
          const revenueAmount = parseFloat(revenue);

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
          console.error(`[Monthly Revenue Job] Error processing artist ${share.artist_id}:`, error);
          errorCount++;
        }
      }

      console.log(`[Monthly Revenue Job] Applied revenue: ${successCount} artists, ${errorCount} errors`);

      return {
        success: true,
        period: period,
        total_revenue: totalRevenue,
        artist_pool: artistPool,
        platform_pool: platformPool,
        artists_processed: successCount,
        errors: errorCount
      };
    } catch (error) {
      console.error('[Monthly Revenue Job] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Tự động trả lương cho tất cả artists (optional - có thể bật/tắt)
   * Chỉ trả cho các records đã được tạo và chưa được trả
   * LƯU Ý: Method này chỉ tính toán và tạo records, KHÔNG tự động trả tiền
   * Admin vẫn cần duyệt và trả tiền thủ công qua API
   */
  static async autoPayAllArtists() {
    try {
      // Get all unpaid revenue sharing records
      const [unpaidRecords] = await db.execute(
        `SELECT DISTINCT artist_id 
         FROM revenue_sharing 
         WHERE is_paid_to_artist = 0 
         AND share_type = 'premium_stream'`
      );

      if (unpaidRecords.length === 0) {
        console.log('[Monthly Revenue Job] No unpaid records to process');
        return { success: true, message: 'No unpaid records' };
      }

      console.log(`[Monthly Revenue Job] Found ${unpaidRecords.length} artists with unpaid revenue`);
      console.log('[Monthly Revenue Job] Note: Auto-pay is disabled. Admin must manually approve payments via API.');

      return {
        success: true,
        message: 'Revenue records created. Admin approval required for payment.',
        artists_with_unpaid: unpaidRecords.length
      };
    } catch (error) {
      console.error('[Monthly Revenue Job] Auto-pay error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = MonthlyRevenueJob;

