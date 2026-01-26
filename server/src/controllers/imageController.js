const fs = require('fs');
const path = require('path');
const Image = require('../models/Image');
const { env } = require('../config/env');
const { uploadImage, buildCartoonUrl } = require('../services/cloudinaryService');
// const { stylizePixar3d } = require('../services/aiStylizeService'); // Commented out - AI service not used, can be enabled later
const { logger } = require('../utils/logger');
const { extractCloudinaryError } = require('../utils/cloudinaryError');

function buildProcessedUrl(processedName) {
  // served via app: /static/processed -> <server>/processed
  return `${env.publicBaseUrl}/static/processed/${processedName}`;
}

async function cartoonizeUpload(req, res) {
  const file = req.file;
  // Always use Pixar 3D style
  const style = 'pixar';

  // Extra backend validation (defense in depth)
  if (!file || !file.path) {
    return res.status(400).json({ error: 'No file received.' });
  }

  // Basic sanity check (avoid empty files)
  const stats = fs.statSync(file.path);
  if (stats.size < 1024) {
    return res.status(400).json({ error: 'Image file is too small.' });
  }

  try {
    // Only use Pixar 3D style with Cloudinary transformations
    // Commented out AI-based Pixar 3D (requires external AI service) - can be enabled later if needed
    // if (style === 'pixar_3d') {
    //   const aiOut = await stylizePixar3d({
    //     filePath: file.path,
    //     fileMimetype: file.mimetype,
    //     requestId: req.id
    //   });
    //   const uploaded = await uploadImage(aiOut.imageUrl || aiOut.imageDataUri);
    //
    //   const payload = {
    //     // Back-compat: old client expects `pngUrl`
    //     pngUrl: uploaded.secure_url,
    //     cartoonUrl: uploaded.secure_url,
    //     publicId: uploaded.public_id,
    //     originalName: file.originalname,
    //     provider: 'ai',
    //     style
    //   };
    //
    //   // Persist metadata if MongoDB is available; otherwise still return the URL for local testing.
    //   try {
    //     const doc = await Image.create({
    //       originalName: file.originalname,
    //       originalPath: path.relative(path.resolve(__dirname, '..', '..'), file.path),
    //       mimetype: file.mimetype,
    //       sizeBytes: file.size,
    //       processedUrl: payload.pngUrl,
    //       cloudinaryPublicId: uploaded.public_id
    //     });
    //
    //     payload.imageId = doc._id;
    //   } catch (_) {
    //     // Ignore DB errors in local-dev no-DB mode
    //   }
    //
    //   return res.status(201).json(payload);
    // }

    // Use Cloudinary Pixar 3D style transformations
    const uploaded = await uploadImage(file.path);
    const cartoonUrl = buildCartoonUrl(uploaded.public_id, { style, lineStrength: 45, colorReduction: 55 });

    const payload = {
      // Back-compat: old client expects `pngUrl`
      pngUrl: cartoonUrl,
      cartoonUrl,
      publicId: uploaded.public_id,
      originalName: file.originalname,
      provider: 'cloudinary',
      style
    };

    // Persist metadata if MongoDB is available; otherwise still return the URL for local testing.
    try {
      const doc = await Image.create({
        originalName: file.originalname,
        originalPath: path.relative(path.resolve(__dirname, '..', '..'), file.path),
        mimetype: file.mimetype,
        sizeBytes: file.size,
        processedUrl: payload.pngUrl,
        cloudinaryPublicId: uploaded.public_id
      });

      payload.imageId = doc._id;
    } catch (_) {
      // Ignore DB errors in local-dev no-DB mode
    }

    return res.status(201).json(payload);
  } catch (error) {
    logger.error('image.cartoonize_failed', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      file: file
        ? { originalName: file.originalname, mimetype: file.mimetype, sizeBytes: file.size }
        : null,
      cloudinary: extractCloudinaryError(error),
      err: error
    });

    const errorResponse = {
      error: error.message || 'Failed to generate cartoon. Please check your Cloudinary configuration and try again.'
    };
    
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = error.stack;
      errorResponse.fullError = error.toString();
    }
    errorResponse.requestId = req.id;

    return res.status(500).json(errorResponse);
  }
}

async function getImage(req, res) {
  const { id } = req.params;
  const doc = await Image.findById(id).lean();
  if (!doc) return res.status(404).json({ error: 'Not found' });
  return res.json(doc);
}

async function cleanupOldFiles(maxAgeHours = 24 * 7) {
  // Optional utility (not scheduled by default). You can run this via a cron job.
  const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
  const images = await Image.find({ createdAt: { $lt: new Date(cutoff) } }).lean();

  for (const img of images) {
    for (const rel of [img.originalPath, img.processedPath]) {
      const abs = path.resolve(__dirname, '..', '..', rel);
      try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (_) {}
    }
    try { await Image.deleteOne({ _id: img._id }); } catch (_) {}
  }
}

module.exports = { cartoonizeUpload, getImage, cleanupOldFiles };
