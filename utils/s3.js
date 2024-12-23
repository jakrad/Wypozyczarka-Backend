// utils\s3.js

const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const { s3 } = require('./aws');

/**
 * Upload an image to S3.
 * @param {Buffer} fileBuffer - The image file buffer.
 * @param {string} mimeType - The MIME type of the image.
 * @param {string} directory - The directory in S3 ('tools' or 'profiles').
 * @returns {string} - The URL of the uploaded image.
 */
const uploadImage = async (fileBuffer, mimeType, directory) => {
  // Compress and resize the image using Sharp
  const compressedImage = await sharp(fileBuffer)
    .resize({ width: 800, withoutEnlargement: true })
    .toFormat('jpeg', { quality: 80 })
    .toBuffer();

  const fileName = `${directory}/${uuidv4()}.jpeg`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
    Body: compressedImage,
    ContentType: 'image/jpeg',
  };

  try {
    const data = await s3.upload(params).promise();
    logger.info(`Image uploaded successfully to ${data.Location}`);
    return data.Location;
  } catch (error) {
    logger.error('Error uploading image to S3:', error);
    throw new Error('Error uploading image');
  }
};

/**
 * Delete an image from S3.
 * @param {string} imageUrl - The URL of the image to delete.
 */
const deleteImage = async (imageUrl) => {
  try {
    const url = new URL(imageUrl);
    const key = decodeURIComponent(url.pathname.substring(1)); // Remove leading '/'

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(params).promise();
    logger.info(`Image deleted successfully from ${key}`);
  } catch (error) {
    logger.error('Error deleting image from S3:', error);
    throw new Error('Error deleting image');
  }
};

module.exports = {
  uploadImage,
  deleteImage,
};
