const File = require('../models/File');
const Job = require('../models/Job');
const path = require('path');
const fs = require('fs');

// @desc    Securely download a completed file
// @route   GET /api/files/download/:id
// @access  Private
exports.downloadFile = async (req, res) => {
  try {
    // 1. Find the file record in MongoDB
    const fileRecord = await File.findById(req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: 'File record not found, bro.' });
    }

    // 2. Fetch the parent job to verify ownership
    const job = await Job.findById(fileRecord.job_id);
    if (!job || job.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized! This file does not belong to you.' });
    }

    // 3. Check if the file is actually completed
    if (fileRecord.status !== 'completed' || !fileRecord.converted_file_path) {
      return res.status(400).json({ success: false, message: 'File is not ready for download yet.' });
    }

    // 4. Resolve the absolute path and verify physical existence on disk
    const absolutePath = path.resolve(fileRecord.converted_file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical file missing from server storage.' });
    }

    // 5. Securely trigger browser download prompt
    res.download(absolutePath, fileRecord.original_name.split('.')[0] + '.' + fileRecord.target_format);

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};