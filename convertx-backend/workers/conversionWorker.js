const { Worker } = require('bullmq');
const { redisConnection } = require('../config/queue');
const Job = require('../models/Job');
const File = require('../models/File');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// 🔥 CLEAN FIXED DOCUMENT & AUDIO IMPORTS
const libre = require('libreoffice-convert');

const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const outputDir = 'converted/';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Ensure the old 'const lib_convert = ...' or 'const promisify = ...' lines are completely gone!
const conversionWorker = new Worker('fileConversion', async (job) => {
  const { jobId, files } = job.data;
  console.log(`\n 📦 [Worker] Processing batch job: ${jobId}`);

  await Job.findByIdAndUpdate(jobId, { status: 'processing', started_at: new Date() });

  let completedCount = 0;
  let failedCount = 0;

  for (const fileInfo of files) {
    try {
      await File.findByIdAndUpdate(fileInfo.fileId, { status: 'processing' });

      const baseName = path.basename(fileInfo.original_file_path, path.extname(fileInfo.original_file_path));
      const targetExt = fileInfo.target_format.toLowerCase();
      const outputFileName = `${baseName}.${targetExt}`;
      const finalOutputPath = path.join(outputDir, outputFileName);

      console.log(` ⚙️  Converting file ${fileInfo.fileId} to ${targetExt}...`);

      // 2. 🔥 SMART ROUTING ENGINE
      const imageFormats = ['webp', 'png', 'jpg', 'jpeg', 'gif', 'bmp'];
      const audioFormats = ['mp3', 'wav', 'aac', 'flac'];
      const docFormats = ['pdf', 'docx', 'txt'];
      if (imageFormats.includes(targetExt)) {
        // --- ROUTE A: IMAGE PROCESSING (SHARP) ---
        await sharp(fileInfo.original_file_path)
          .toFormat(targetExt === 'jpg' ? 'jpeg' : targetExt)
          .toFile(finalOutputPath);

      } else if (audioFormats.includes(targetExt)) {
        // --- ROUTE B: AUDIO PROCESSING (FFMPEG) ---
        await new Promise((resolve, reject) => {
          ffmpeg(fileInfo.original_file_path)
            .toFormat(targetExt)
            .on('end', () => resolve())
            .on('error', (err) => reject(err))
            .save(finalOutputPath);
        });

      } else if (docFormats.includes(targetExt)) {
  // --- ROUTE C: DOCUMENTS (LIBREOFFICE) ---
  console.log(` 📄 Passing document to LibreOffice core engine...`);
  const inputBuffer = fs.readFileSync(fileInfo.original_file_path);
  
  const options = {
    soffice: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
  };

  // Convert using the native callback wrapper to avoid async promise mismatches
  const outputBuffer = await new Promise((resolve, reject) => {
    libre.convert(inputBuffer, `.${targetExt}`, undefined, (err, done) => {
      if (err) {
        return reject(err);
      }
      resolve(done);
    });
  });
  
  fs.writeFileSync(finalOutputPath, outputBuffer);

} else {
        throw new Error(`Format .${targetExt} routing handler is not wired yet!`);
      }

      // Success update
      await File.findByIdAndUpdate(fileInfo.fileId, {
        status: 'completed',
        converted_file_path: finalOutputPath,
        completed_at: new Date()
      });

      completedCount++;
    } catch (err) {
      console.error(` ❌ Failed converting file ${fileInfo.fileId}:`, err.message);
      await File.findByIdAndUpdate(fileInfo.fileId, {
        status: 'failed',
        error_message: err.message
      });
      failedCount++;
    }
  }

  let finalJobStatus = 'completed';
  if (failedCount > 0 && completedCount > 0) finalJobStatus = 'partial_success';
  if (failedCount > 0 && completedCount === 0) finalJobStatus = 'failed';

  await Job.findByIdAndUpdate(jobId, { status: finalJobStatus, completed_at: new Date() });
  console.log(` ✅ [Worker] Batch job ${jobId} execution finished cleanly.`);
}, {
  connection: redisConnection,
  concurrency: 2
});

module.exports = conversionWorker;