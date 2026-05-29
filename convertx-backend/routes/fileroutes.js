const express = require('express');
const { downloadFile } = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Secure download endpoint route
router.get('/download/:id', protect, downloadFile);

module.exports = router;