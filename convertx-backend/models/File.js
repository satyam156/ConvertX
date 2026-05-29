const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  job_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  original_name: { 
    type: String, 
    required: true 
  },
  source_format: { 
    type: String, 
    required: true 
  },
  target_format: { 
    type: String, 
    required: true 
  },
  file_size: { 
    type: Number, // Stored in bytes
    required: true 
  }, 
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed'], 
    default: 'pending' 
  },
  original_file_path: { 
    type: String, 
    required: true 
  },
  converted_file_path: { 
    type: String 
  },
  error_message: { 
    type: String 
  },
  expiration_time: { 
    type: Date, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('File', FileSchema);