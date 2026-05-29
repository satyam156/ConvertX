const { Queue } = require('bullmq');
const IORedis = require('ioredis');

// Establish connection setup for Redis
const redisConnection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null // Required configuration rule for BullMQ
});

// Initialize the main file conversion queue
const fileConversionQueue = new Queue('fileConversion', {
  connection: redisConnection
});

module.exports = { fileConversionQueue, redisConnection };