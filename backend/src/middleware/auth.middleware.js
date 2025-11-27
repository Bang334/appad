const jwt = require('jsonwebtoken');

// Verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Check if user is artist
const isArtist = (req, res, next) => {
  if (req.user.role !== 'artist') {
    return res.status(403).json({
      success: false,
      message: 'Artist access required'
    });
  }
  next();
};

// Check if user owns the artist (artist_id in params matches user's artist_id)
const isArtistOwner = async (req, res, next) => {
  try {
    const { artist_id } = req.params;
    const userArtistId = req.user.artist_id;

    // Admin can access any artist
    if (req.user.role === 'admin') {
      return next();
    }

    // Artist must own the artist_id
    if (req.user.role === 'artist' && userArtistId && parseInt(artist_id) === parseInt(userArtistId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'You do not have permission to access this artist'
    });
  } catch (error) {
    console.error('isArtistOwner error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  isArtist,
  isArtistOwner
};

