const express = require('express');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadImage, buildCartoonUrl } = require('../services/cloudinaryService');
const { logger } = require('../utils/logger');
const { extractCloudinaryError } = require('../utils/cloudinaryError');

const router = express.Router();

// POST /api/cartoonify
// Body: { imagePath: <base64 data URI or remote URL> }
router.post(
  '/cartoonify',
  asyncHandler(async (req, res) => {
    const { imagePath } = req.body || {};

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: imagePath',
        requestId: req.id
      });
    }

    try {
      const uploaded = await uploadImage(imagePath);
      const cartoonUrl = buildCartoonUrl(uploaded.public_id, { lineStrength: 30, colorReduction: 60 });
      return res.status(200).json({
        success: true,
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
      return res.status(500).json({ success: false, message: error.message, requestId: req.id });
    }
  })
);

module.exports = router;


