const Job = require('../models/Job');
const File = require('../models/File');
const { fileConversionQueue } = require('../config/queue'); // 1. Import the queue
const path = require('path');

// @desc    Upload bulk files and create conversion job
// @route   POST /api/jobs/upload
// @access  Private
exports.uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload at least one file' });
    }

    const targetFormat = req.body.targetFormat;
    if (!targetFormat) {
      return res.status(400).json({ success: false, message: 'Please specify a target format for conversion' });
    }

    // Create the Parent Job
    const job = await Job.create({
      user_id: req.user._id,
      total_files: req.files.length,
      status: 'pending'
    });

    const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    const fileRecords = req.files.map((file) => {
      const ext = path.extname(file.originalname).replace('.', '').toLowerCase();
      
      return {
        job_id: job._id,
        original_name: file.originalname,
        source_format: ext,
        target_format: targetFormat.toLowerCase(),
        file_size: file.size,
        status: 'pending',
        original_file_path: file.path,
        expiration_time: expirationTime
      };
    });

    // Bulk insert files into MongoDB
    const savedFiles = await File.insertMany(fileRecords);

    // 2. 🔥 PUSH THE JOB TO REDIS QUEUE
    // We send the parent jobId and an array of individual file info to be processed background
    await fileConversionQueue.add(`conversion-job-${job._id}`, {
      jobId: job._id,
      files: savedFiles.map(f => ({
        fileId: f._id,
        original_file_path: f.original_file_path,
        target_format: f.target_format
      }))
    }, {
      attempts: 3, // Automatically retry 3 times if a file conversion glitches out
      backoff: 5000 // Wait 5 seconds before retrying
    });

    res.status(201).json({
      success: true,
      message: 'Batch uploaded successfully. Added to background processing queue.',
      jobId: job._id,
      filesUploaded: savedFiles.length
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Get status of a specific job and its individual files
// @route   GET /api/jobs/:id
// @access  Private
exports.getJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Security check: Make sure this job belongs to the requesting user
    if (job.user_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this job' });
    }

    // Fetch all individual files mapped to this parent job
    const files = await File.find({ job_id: job._id });

    res.status(200).json({
      success: true,
      job: {
        id: job._id,
        status: job.status,
        total_files: job.total_files,
        started_at: job.started_at,
        completed_at: job.completed_at
      },
      files: files.map(f => ({
        id: f._id,
        original_name: f.original_name,
        source_format: f.source_format,
        target_format: f.target_format,
        file_size: f.file_size,
        status: f.status,
        error_message: f.error_message,
        // Don't leak full backend server file paths to the frontend interface
        download_available: f.status === 'completed'
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all conversion jobs for the logged-in user
// @route   GET /api/jobs/history
// @access  Private
exports.getUserJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ user_id: req.user._id }).sort({ created_at: -1 });
    
    res.status(200).json({
      success: true,
      count: jobs.length,
      jobs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};