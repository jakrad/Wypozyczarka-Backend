// utils/aws.js
const AWS = require('aws-sdk');
const logger = require('./logger');

// Configure AWS SDK (Credentials are handled by IAM Role or environment variables)
const s3 = new AWS.S3({
  region: process.env.AWS_REGION, // e.g., 'us-east-1'
});

module.exports = {
  s3,
};
