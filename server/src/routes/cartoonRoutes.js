const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadImage, buildCartoonUrl } = require('../services/cloudinaryService');
const { stylizePixar3d } = require('../services/aiStylizeService');
const { logger } = require('../utils/logger');
const { extractCloudinaryError } = require('../utils/cloudinaryError');

const router = express.Router();

// POST /api/cartoonify
// Body: { imagePath: <base64 data URI or remote URL>, style?: "cloudinary"|"cloudinary_clean"|"pixar_3d" }
router.post(
  '/cartoonify',
  asyncHandler(async (req, res) => {
    const { imagePath, style = 'cloudinary' } = req.body || {};

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: imagePath',
        requestId: req.id
      });
    }

    try {
      if (style === 'pixar_3d') {
        const aiOut = await stylizePixar3d({ imagePathOrDataUri: imagePath, requestId: req.id });
        const uploaded = await uploadImage(aiOut.imageUrl || aiOut.imageDataUri);
        return res.status(200).json({
          success: true,
          style,
          provider: 'ai',
          cartoonUrl: uploaded.secure_url,
          publicId: uploaded.public_id
        });
      }

      const uploaded = await uploadImage(imagePath);
      const cartoonUrl = buildCartoonUrl(uploaded.public_id, {
        style,
        // Slight toon look (less harsh outlines + less color flattening)
        lineStrength: 45,
        colorReduction: 55
      });
      return res.status(200).json({
        success: true,
        style,
        provider: 'cloudinary',
        cartoonUrl,
        publicId: uploaded.public_id
      });
    } catch (error) {
      logger.error('cartoonify.failed', {
        requestId: req.id,
        method: req.method,
        path: req.originalUrl,
        cloudinary: extractCloudinaryError(error),
        err: error
      });

      const isAiConfigError =
        style === 'pixar_3d' && String(error?.message || '').toLowerCase().includes('ai_style_api_url');
      const status = isAiConfigError ? 400 : 500;
      return res.status(status).json({ success: false, message: error.message, requestId: req.id });
    }
  })
);

module.exports = router;


