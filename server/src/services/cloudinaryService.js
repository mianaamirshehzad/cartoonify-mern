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

function buildCartoonUrl(
  publicId,
  { style = 'cloudinary', lineStrength = 45, colorReduction = 55 } = {}
) {
  ensureCloudinaryConfigured();
  const transformations = [];

  // Cleanup before stylizing (helps avoid muddy/noisy areas + harsh shadows)
  transformations.push({ effect: 'improve' });
  transformations.push({ effect: 'auto_contrast' });

  // Only use Pixar-style 3D animation effect
  if (style === 'pixar' || style === 'pixar_3d') {
    // Pixar-like 3D animation style transformations
    transformations.push(
      // Enhance colors and make them vibrant like Pixar
      { effect: 'saturation:35' },
      { effect: 'vibrance:25' },
      // Soft cartoonify with reduced lines for smoother 3D look
      { effect: 'cartoonify:30:35' }, // Lower line strength, moderate color reduction for smoother look
      // Enhance brightness and contrast for that Pixar glow
      { effect: 'brightness:10' },
      { effect: 'contrast:20' },
      // Sharpen details for crisp Pixar look
      { effect: 'sharpen:30' },
      // Add warmth with color adjustment
      { effect: 'saturation:20' },
      // Final polish - enhance overall quality
      { effect: 'improve' }
    );
  } 
  // Commented out other styles - can be enabled later if needed
  // else if (style === 'cloudinary_clean') {
  //   // Slightly portrait-friendlier preset (still filter-based)
  //   transformations.push(
  //     { effect: 'saturation:5' },
  //     { effect: `cartoonify:${lineStrength}:${colorReduction}` },
  //     { effect: 'saturation:20' },
  //     { effect: 'brightness:5' }
  //   );
  // } else {
  //   // Default Cloudinary cartoonify
  //   transformations.push({ effect: 'saturation:5' });
  //   transformations.push({ effect: `cartoonify:${lineStrength}:${colorReduction}` });
  // }

  // Keep detail, but keep the look subtle
  transformations.push({ effect: 'sharpen:15' });

  // Prefer best compression quality + PNG to reduce banding/JPEG artifacts in flat toon regions
  transformations.push({ quality: 'auto:best' }, { fetch_format: 'png' });

  return cloudinary.url(publicId, { secure: true, transformation: transformations });
}

module.exports = { uploadImage, buildCartoonUrl };


