// utils\aws.js

const AWS = require('aws-sdk');
const logger = require('./logger');

// Log AWS configurations for debugging
logger.info(`AWS Region: ${process.env.AWS_REGION}`);
logger.info(`S3 Bucket Name: ${process.env.S3_BUCKET_NAME}`);

// Configure AWS SDK (Credentials are handled by IAM Role or environment variables)
const s3 = new AWS.S3({
  region: process.env.AWS_REGION, // e.g., 'eu-north-1'
});

module.exports = {
  s3,
};
