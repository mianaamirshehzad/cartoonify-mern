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
  { 
    style = 'cloudinary', 
    lineStrength = 45, 
    colorReduction = 55,
    // Pixar style refinement parameters
    pixarSaturation = 35,        // Initial saturation boost (0-100, higher = more vibrant)
    pixarVibrance = 25,          // Color vibrance (0-100, higher = more vivid colors)
    pixarLineStrength = 30,      // Cartoonify line strength (0-100, lower = smoother lines)
    pixarColorReduction = 35,    // Cartoonify color reduction (0-100, lower = more colors)
    pixarBrightness = 10,        // Brightness adjustment (-100 to 100, positive = brighter)
    pixarContrast = 20,          // Contrast adjustment (-100 to 100, positive = more contrast)
    pixarSharpen = 30,           // Sharpening intensity (0-100, higher = sharper)
    pixarFinalSaturation = 20    // Final saturation adjustment (0-100)
  } = {}
) {
  ensureCloudinaryConfigured();
  const transformations = [];

  // Cleanup before stylizing (helps avoid muddy/noisy areas + harsh shadows)
  transformations.push({ effect: 'improve' });
  transformations.push({ effect: 'auto_contrast' });

  // Only use Pixar-style 3D animation effect (now optimized for Ghibli-like style)
  if (style === 'pixar' || style === 'pixar_3d') {
    // Ghibli-like painterly animation style transformations
    // Soft, watercolor-like, dreamy aesthetic inspired by Studio Ghibli
    // Key characteristics: softer lines, pastel colors, gentle contrast, painterly texture
    
    // Calculate Ghibli-optimized values (softer than Pixar defaults)
    const ghibliSaturation = Math.min(pixarSaturation, 25); // Cap at 25 for softer colors
    const ghibliVibrance = Math.min(pixarVibrance, 18); // Lower vibrance for pastel look
    const ghibliLineStrength = Math.max(pixarLineStrength - 10, 15); // Very soft lines (15-20 range)
    const ghibliColorReduction = Math.max(pixarColorReduction - 10, 20); // More color detail (20-25 range)
    const ghibliBrightness = Math.max(pixarBrightness - 3, 5); // Gentle brightness
    const ghibliContrast = Math.max(pixarContrast - 8, 10); // Soft contrast for dreamy look
    const ghibliSharpen = Math.max(pixarSharpen - 12, 15); // Gentle sharpening
    const ghibliFinalSaturation = Math.min(pixarFinalSaturation, 15); // Final soft saturation
    
    transformations.push(
      // Soft, natural color enhancement (less vibrant than Pixar)
      { effect: `saturation:${ghibliSaturation}` },
      { effect: `vibrance:${ghibliVibrance}` },
      // Very soft cartoonify with minimal lines for painterly look
      { effect: `cartoonify:${ghibliLineStrength}:${ghibliColorReduction}` },
      // Gentle brightness and contrast (softer than Pixar)
      { effect: `brightness:${ghibliBrightness}` },
      { effect: `contrast:${ghibliContrast}` },
      // Soft blur for watercolor/painterly effect (applied before sharpening)
      { effect: 'blur:150' }, // Soft blur for painterly texture
      // Gentle sharpening (less aggressive than Pixar)
      { effect: `sharpen:${ghibliSharpen}` },
      // Add soft color warmth
      { effect: `saturation:${ghibliFinalSaturation}` },
      // Add slight warm tint for Ghibli's natural palette
      { effect: 'tint:8:fff8e1' }, // Very subtle warm cream tint
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

  // Final sharpening is already applied in Pixar style, so only add if not Pixar
  if (style !== 'pixar' && style !== 'pixar_3d') {
    transformations.push({ effect: 'sharpen:15' });
  }

  // Prefer best compression quality + PNG to reduce banding/JPEG artifacts in flat toon regions
  transformations.push({ quality: 'auto:best' }, { fetch_format: 'png' });

  return cloudinary.url(publicId, { secure: true, transformation: transformations });
}

module.exports = { uploadImage, buildCartoonUrl };


