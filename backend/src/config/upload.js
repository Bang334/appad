const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    './uploads',
    './uploads/songs',
    './uploads/images',
    './uploads/avatars',
    './uploads/covers'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, './uploads/songs');
    } else if (file.mimetype.startsWith('image/')) {
      const folder = req.body.type === 'avatar' ? './uploads/avatars' : './uploads/covers';
      cb(null, folder);
    } else {
      cb(null, './uploads');
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedAudioTypes = [
    'audio/mpeg', // mp3
    'audio/mp3', 
    'audio/wav', 
    'audio/ogg',
    'audio/m4a',
    'audio/x-m4a',
    'audio/mp4',  // m4a container
    'video/mp4'   // some m4a are detected as video/mp4
  ];
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  
  if (allowedAudioTypes.includes(file.mimetype) || allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only audio and image files are allowed.`), false);
  }
};

// Upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 30 * 1024 * 1024, // 30MB default (tăng lên để hỗ trợ file lớn hơn)
    fieldSize: 10 * 1024 * 1024, // 10MB cho các field khác
  }
});

module.exports = upload;

