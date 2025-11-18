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

// Import database connection
const db = require('./src/config/database');

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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
});

