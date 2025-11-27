const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dnd4apm6t',
  api_key: process.env.CLOUDINARY_API_KEY || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret'
});

// Storage for songs (audio files)
const songStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'music-app/songs',
      resource_type: 'video', // Use 'video' for audio files
      allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'aac'],
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
  artistImageStorage,
  avatarStorage
};

