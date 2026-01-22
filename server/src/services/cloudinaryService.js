const cloudinary = require('cloudinary').v2;
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

let isConfigured = false;

function ensureCloudinaryConfigured() {
  if (isConfigured) return;

  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  }

  // Common misconfiguration: people paste masked secrets like "**********"
  if (String(env.cloudinaryApiSecret).includes('*')) {
    throw new Error(
      'CLOUDINARY_API_SECRET looks masked (contains "*"). Please paste the real Cloudinary API Secret value.'
    );
  }

  // Log which creds are being used (safe: no secrets, no full key)
  logger.info('cloudinary.configuring', {
    cloudName: env.cloudinaryCloudName,
    apiKeyLast4: String(env.cloudinaryApiKey).slice(-4)
  });

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret
  });

  isConfigured = true;
}

async function uploadImage(imagePathOrDataUri) {
  ensureCloudinaryConfigured();

  const result = await cloudinary.uploader.upload(imagePathOrDataUri, {
    folder: 'cartoon_app',
    resource_type: 'image'
  });

  return result;
}

function buildCartoonUrl(publicId, { lineStrength = 30, colorReduction = 60 } = {}) {
  ensureCloudinaryConfigured();
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { effect: `cartoonify:${lineStrength}:${colorReduction}` },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
}

module.exports = { uploadImage, buildCartoonUrl };


