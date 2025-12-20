const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const songRoutes = require('./src/routes/song.routes');
const artistRoutes = require('./src/routes/artist.routes');
const albumRoutes = require('./src/routes/album.routes');
const genreRoutes = require('./src/routes/genre.routes');
const playlistRoutes = require('./src/routes/playlist.routes');
const favoriteRoutes = require('./src/routes/favorite.routes');
const historyRoutes = require('./src/routes/history.routes');
const commentRoutes = require('./src/routes/comment.routes');
const adminRoutes = require('./src/routes/admin.routes');
const premiumRoutes = require('./src/routes/premium.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const revenueRoutes = require('./src/routes/revenue.routes');
const notificationRoutes = require('./src/routes/notification.routes');
const followRoutes = require('./src/routes/follow.routes');
const reportRoutes = require('./src/routes/report.routes');

// Import database connection
const db = require('./src/config/database');

// Import cron jobs
const cron = require('node-cron');
const MonthlyRevenueJob = require('./src/jobs/monthly-revenue.job');
const PremiumExpiringJob = require('./src/jobs/premium-expiring.job');
const ArtistMembershipExpiringJob = require('./src/jobs/artist-membership-expiring.job');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// JSON parsing middleware - only for non-multipart routes
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  
  // Skip JSON parsing for multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  
  // Apply JSON parser for other requests
  express.json()(req, res, next);
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/songs', songRoutes);
app.use('/api/artists', artistRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Music App API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// ===== CRON JOBS =====
// Monthly Revenue Job: Chạy vào 1h sáng ngày đầu tiên của mỗi tháng
// Format: minute hour day month day-of-week
cron.schedule('0 1 1 * *', async () => {
  console.log('[Cron] Starting monthly revenue calculation job...');
  const result = await MonthlyRevenueJob.processLastMonth();
  console.log('[Cron] Monthly revenue job completed:', result);
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// Premium Expiring Job: Chạy mỗi ngày lúc 9h sáng
cron.schedule('0 9 * * *', async () => {
  console.log('[Cron] Starting premium expiring notification job...');
  const result = await PremiumExpiringJob.checkAndNotify();
  console.log('[Cron] Premium expiring job completed:', result);
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// Artist Membership Expiring Job: Chạy mỗi ngày lúc 0h (nửa đêm)
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Starting artist membership expiring job...');
  const result = await ArtistMembershipExpiringJob.updateExpired();
  console.log('[Cron] Artist membership expiring job completed:', result);
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

const SongReleaseJob = require('./src/jobs/song-release.job');

// ... (other imports)

// Song Release Job: Chạy mỗi phút để check và release nhạc đã đến giờ hẹn
cron.schedule('* * * * *', async () => {
  // console.log('[Cron] Checking for scheduled song releases...');
  const result = await SongReleaseJob.checkAndRelease();
  if (result.released_count > 0) {
    console.log(`[Cron] 🎵 Released ${result.released_count} scheduled songs!`);
  }
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// Log cron job schedules
console.log('📅 Cron jobs scheduled:');
console.log('  - Monthly Revenue: 1:00 AM on 1st of every month');
console.log('  - Premium Expiring: 9:00 AM every day');
console.log('  - Artist Membership Expiring: 12:00 AM (midnight) every day');
console.log('  - Song Release: Every minute');

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

