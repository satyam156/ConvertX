const express = require('express');
const { uploadFiles, getJobStatus, getUserJobs } = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

const maxFiles = parseInt(process.env.MAX_FILE_COUNT) || 25;

// Route 1: Upload batch files (POST)
router.post('/upload', protect, upload.array('files', maxFiles), uploadFiles);

// Route 2: Get all historical jobs for dashboard timeline (GET)
router.get('/history', protect, getUserJobs);

// Route 3: Get real-time status details of a specific job ID (GET)
router.get('/:id', protect, getJobStatus);

module.exports = router;