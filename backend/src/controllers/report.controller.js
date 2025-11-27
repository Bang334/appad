const ReportModel = require('../models/report.model');
const NotificationModel = require('../models/notification.model');
const SongModel = require('../models/song.model');
const ArtistModel = require('../models/artist.model');

class ReportController {
  // Create report (customer)
  static async createReport(req, res) {
    try {
      const userId = req.user.user_id;
      const { song_id, report_type, title, description } = req.body;

      // Validate required fields
      if (!song_id || !title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Song ID, title, and description are required'
        });
      }

      // Check if user already reported this song
      const alreadyReported = await ReportModel.hasUserReported(song_id, userId);
      if (alreadyReported) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã báo cáo bài hát này rồi'
        });
      }

      // Create report
      const reportId = await ReportModel.create({
        song_id,
        reporter_id: userId,
        report_type: report_type || 'other',
        title,
        description
      });

      // Get song and artist info for notifications
      const song = await SongModel.findById(song_id);
      if (song && song.artist_id) {
        const artist = await ArtistModel.findById(song.artist_id);
        
        // Notify artist
        if (artist && artist.user_id) {
          await NotificationModel.create({
            user_id: artist.user_id,
            type: 'system',
            title: 'Báo cáo mới về bài hát',
            message: `Bài hát "${song.title}" của bạn đã được báo cáo: ${title}`,
            data: {
              report_id: reportId,
              song_id: song_id,
              song_title: song.title,
              report_type: report_type || 'other'
            }
          });
        }
      }

      // Notify all admins (get all admin users)
      const db = require('../config/database');
      const [admins] = await db.execute(
        "SELECT user_id FROM users WHERE role = 'admin'"
      );

      if (admins && admins.length > 0) {
        const notificationPromises = admins.map(admin =>
          NotificationModel.create({
            user_id: admin.user_id,
            type: 'system',
            title: 'Báo cáo mới về bài hát',
            message: `Có báo cáo mới về bài hát "${song?.title || 'Unknown'}": ${title}`,
            data: {
              report_id: reportId,
              song_id: song_id,
              song_title: song?.title,
              report_type: report_type || 'other'
            }
          })
        );
        await Promise.all(notificationPromises);
      }

      res.status(201).json({
        success: true,
        message: 'Báo cáo đã được gửi thành công',
        data: { report_id: reportId }
      });
    } catch (error) {
      console.error('Create report error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get user's own reports
  static async getMyReports(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0 } = req.query;

      const reports = await ReportModel.findByReporter(userId, limit, offset);

      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      console.error('Get my reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get all reports (admin only)
  static async getAllReports(req, res) {
    try {
      const { limit = 50, offset = 0, status } = req.query;

      const reports = await ReportModel.findAll(limit, offset, status);
      const pendingCount = await ReportModel.getPendingCount();

      res.json({
        success: true,
        data: reports,
        pending_count: pendingCount
      });
    } catch (error) {
      console.error('Get all reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get reports for artist's songs
  static async getArtistReports(req, res) {
    try {
      const userId = req.user.user_id;
      const { limit = 50, offset = 0, status } = req.query;

      // Get artist_id from user_id
      const ArtistModel = require('../models/artist.model');
      const artist = await ArtistModel.findByUserId(userId);
      
      if (!artist) {
        return res.status(403).json({
          success: false,
          message: 'User is not an artist'
        });
      }

      const reports = await ReportModel.findByArtist(artist.artist_id, limit, offset, status);
      const pendingCount = await ReportModel.getPendingCount(artist.artist_id);

      res.json({
        success: true,
        data: reports,
        pending_count: pendingCount
      });
    } catch (error) {
      console.error('Get artist reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get report by ID
  static async getReportById(req, res) {
    try {
      const { id } = req.params;
      const report = await ReportModel.findById(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error('Get report by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Update report status (admin or artist)
  static async updateReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, admin_response } = req.body;
      const userId = req.user.user_id;
      const userRole = req.user.role;

      // Validate status
      const validStatuses = ['pending', 'reviewing', 'resolved', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }

      // Get report
      const report = await ReportModel.findById(id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found'
        });
      }

      // Check permissions
      // Admin can update any report
      // Artist can only update reports for their own songs
      if (userRole !== 'admin') {
        if (userRole === 'artist') {
          const ArtistModel = require('../models/artist.model');
          const artist = await ArtistModel.findByUserId(userId);
          if (!artist || artist.artist_id !== report.artist_id) {
            return res.status(403).json({
              success: false,
              message: 'You can only update reports for your own songs'
            });
          }
        } else {
          return res.status(403).json({
            success: false,
            message: 'Permission denied'
          });
        }
      }

      // Update status
      const success = await ReportModel.updateStatus(
        id,
        status,
        userId,
        admin_response || null
      );

      if (!success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to update report status'
        });
      }

      // Notify reporter if resolved or rejected
      if (status === 'resolved' || status === 'rejected') {
        await NotificationModel.create({
          user_id: report.reporter_id,
          type: 'system',
          title: status === 'resolved' ? 'Báo cáo đã được xử lý' : 'Báo cáo đã bị từ chối',
          message: `Báo cáo về bài hát "${report.song_title}" đã được ${status === 'resolved' ? 'xử lý' : 'từ chối'}.${admin_response ? `\nPhản hồi: ${admin_response}` : ''}`,
          data: {
            report_id: id,
            song_id: report.song_id,
            song_title: report.song_title,
            status
          }
        });
      }

      res.json({
        success: true,
        message: 'Report status updated successfully'
      });
    } catch (error) {
      console.error('Update report status error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }

  // Get pending reports count
  static async getPendingCount(req, res) {
    try {
      const userId = req.user.user_id;
      const userRole = req.user.role;

      let count;
      if (userRole === 'admin') {
        count = await ReportModel.getPendingCount();
      } else if (userRole === 'artist') {
        const ArtistModel = require('../models/artist.model');
        const artist = await ArtistModel.findByUserId(userId);
        if (artist) {
          count = await ReportModel.getPendingCount(artist.artist_id);
        } else {
          count = 0;
        }
      } else {
        count = 0;
      }

      res.json({
        success: true,
        data: { count }
      });
    } catch (error) {
      console.error('Get pending count error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  }
}

module.exports = ReportController;

