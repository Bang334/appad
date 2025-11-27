const ArtistMembershipModel = require('../models/artist-membership.model');

/**
 * Artist Membership Expiring Job
 * Chạy tự động mỗi ngày lúc 0h (nửa đêm)
 * Cập nhật trạng thái các hội viên đã hết hạn từ 'active' sang 'expired'
 */
class ArtistMembershipExpiringJob {
  /**
   * Cập nhật trạng thái các hội viên đã hết hạn
   */
  static async updateExpired() {
    try {
      console.log('[Artist Membership Expiring Job] Checking for expired memberships...');

      const updatedCount = await ArtistMembershipModel.updateExpiredMemberships();

      console.log(`[Artist Membership Expiring Job] Updated ${updatedCount} expired memberships`);

      return {
        success: true,
        updated: updatedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Artist Membership Expiring Job] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ArtistMembershipExpiringJob;

