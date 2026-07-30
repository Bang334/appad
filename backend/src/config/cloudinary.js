const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('./environment');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for songs (audio files)
const songStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'music-app/songs',
      resource_type: 'video', // Use 'video' for audio files
      allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'mp4'],
      public_id: `song-${Date.now()}`,
    };
  },
});

// Storage for cover images
const coverStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'music-app/covers',
      resource_type: 'image',
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
      public_id: `cover-${Date.now()}`,
    };
  },
});

const mediaStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isAudio =
      file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4';
    const prefix = isAudio ? 'song' : 'cover';

    return {
      folder: isAudio ? 'music-app/songs' : 'music-app/covers',
      resource_type: isAudio ? 'video' : 'image',
      allowed_formats: isAudio
        ? ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'mp4']
        : ['jpg', 'png', 'jpeg', 'gif', 'webp'],
      public_id: `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

// Storage for artist images
const artistImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'music-app/artists',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [
      { width: 400, height: 400, crop: 'fill', quality: 'auto' }
    ]
  },
});

// Storage for avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'music-app/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp'],
    transformation: [
      { width: 200, height: 200, crop: 'fill', quality: 'auto', gravity: 'face' }
    ]
  },
});

module.exports = {
  cloudinary,
  songStorage,
  coverStorage,
  mediaStorage,
  artistImageStorage,
  avatarStorage
};

