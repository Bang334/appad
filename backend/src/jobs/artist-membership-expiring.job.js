const ArtistMembershipModel = require('../models/artist-membership.model');
const UserModel = require('../models/user.model');

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
      console.log('[Membership Expiry Job] Checking for expired memberships and premium...');

      const [artistUpdated, premiumUpdated] = await Promise.all([
        ArtistMembershipModel.updateExpiredMemberships(),
        UserModel.updateExpiredPremium()
      ]);

      if (artistUpdated > 0 || premiumUpdated > 0) {
        console.log(`[Membership Expiry Job] Updated: ${artistUpdated} artist memberships, ${premiumUpdated} site-wide premiums`);
      }

      return {
        success: true,
        artist_updated: artistUpdated,
        premium_updated: premiumUpdated,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Membership Expiry Job] Error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = ArtistMembershipExpiringJob;

