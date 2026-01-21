const fs = require('fs');
const path = require('path');
const Image = require('../models/Image');
const { env } = require('../config/env');
const { cartoonizeToPng } = require('../services/cartoonService');

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

  const { outName, outPath } = await cartoonizeToPng(file.path, env.processedAbsDir);

  const payload = {
    pngUrl: buildProcessedUrl(outName),
    originalName: file.originalname
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
