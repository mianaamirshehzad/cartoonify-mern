const fs = require('fs');
const path = require('path');
const Image = require('../models/Image');
const { env } = require('../config/env');
const { cartoonizeWithLightX } = require('../services/lightxService');

function buildProcessedUrl(processedName) {
  // served via app: /static/processed -> <server>/processed
  return `${env.publicBaseUrl}/static/processed/${processedName}`;
}

async function cartoonizeUpload(req, res) {
  const file = req.file;

  // Extra backend validation (defense in depth)
  if (!file || !file.path) {
    return res.status(400).json({ error: 'No file received.' });
  }

  // Check if API key is configured
  if (!env.lightxApiKey) {
    return res.status(500).json({ 
      error: 'LightX API key not configured. Please set LIGHTX_API_KEY environment variable.' 
    });
  }

  // Validate image size (minimum 512x512 as per LightX requirements)
  // We'll let LightX handle this validation, but we can add a basic check here
  const stats = fs.statSync(file.path);
  if (stats.size < 1024) {
    return res.status(400).json({ error: 'Image file is too small. Minimum size is 512x512 pixels.' });
  }

  // Extract optional parameters from request body or query
  const textPrompt = req.body?.textPrompt || req.query?.textPrompt || null;
  const styleImageUrl = req.body?.styleImageUrl || req.query?.styleImageUrl || null;

  try {
    const { outName, outPath, cartoonUrl } = await cartoonizeWithLightX(
      file.path,
      env.processedAbsDir,
      file.mimetype,
      textPrompt,
      styleImageUrl
    );

    const payload = {
      pngUrl: buildProcessedUrl(outName),
      originalName: file.originalname,
      lightxCartoonUrl: cartoonUrl // Also return the original LightX URL
    };

    // Persist metadata if MongoDB is available; otherwise still return the PNG URL for local testing.
    try {
      const doc = await Image.create({
        originalName: file.originalname,
        originalPath: path.relative(path.resolve(__dirname, '..', '..'), file.path),
        mimetype: file.mimetype,
        sizeBytes: file.size,

        processedName: outName,
        processedPath: path.relative(path.resolve(__dirname, '..', '..'), outPath),
        processedUrl: payload.pngUrl
      });

      payload.imageId = doc._id;
    } catch (_) {
      // Ignore DB errors in local-dev no-DB mode
    }

    return res.status(201).json(payload);
  } catch (error) {
    // Handle LightX API errors
    console.error('LightX API error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    // In development, include more details
    const errorResponse = {
      error: error.message || 'Failed to generate cartoon. Please check your API key and try again.'
    };
    
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = error.stack;
      errorResponse.fullError = error.toString();
    }
    
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
