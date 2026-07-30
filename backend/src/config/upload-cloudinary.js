const multer = require('multer');
const {
  songStorage,
  coverStorage,
  mediaStorage,
  artistImageStorage,
  avatarStorage
} = require('./cloudinary');

// Upload configurations
const uploadSong = multer({
  storage: songStorage,
  limits: {
    fileSize: 30 * 1024 * 1024, // 30MB for audio
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg', 
      'audio/mp3', 
      'audio/wav', 
      'audio/ogg', 
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/aac',
      'audio/x-aac',
      'video/mp4'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid audio file type: ' + file.mimetype), false);
    }
  }
});

const uploadCover = multer({
  storage: coverStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images (tăng lên)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image file type: ' + file.mimetype), false);
    }
  }
});

const uploadMedia = multer({
  storage: mediaStorage,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mp4',
      'audio/aac',
      'audio/x-aac',
      'video/mp4',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  },
});

const uploadArtistImage = multer({
  storage: artistImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  }
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
  }
});

module.exports = {
  uploadSong,
  uploadCover,
  uploadMedia,
  uploadArtistImage,
  uploadAvatar
};

