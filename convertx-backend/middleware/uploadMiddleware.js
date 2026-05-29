const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload folders exist on boot
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure how files are named and saved locally
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique name: timestamp-randomnumber.extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File format filter (Reject executable or malicious files)
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif|bmp|tiff|svg|pdf|docx|doc|ppt|xlsx|txt|epub|html|mp4|mp3|wav|aac|flac|ogg|avi|mov|mkv|webm|zip|rar|heic/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (extname) {
    return cb(null, true);
  } else {
    cb(new Error('Error: File type not supported for conversion!'), false);
  }
};

// Initialize Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800, // 50MB
  }
});

module.exports = upload;