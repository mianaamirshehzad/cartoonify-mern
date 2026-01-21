const express = require('express');
const { upload } = require('../middlewares/upload');
const { validateUpload } = require('../middlewares/validateUpload');
const { asyncHandler } = require('../utils/asyncHandler');
const { cartoonizeUpload, getImage } = require('../controllers/imageController');
const { env } = require('../config/env');

const router = express.Router();

router.post(
  '/cartoonize',
  upload.single(env.uploadFieldName),
  validateUpload(env.uploadFieldName),
  asyncHandler(cartoonizeUpload)
);

router.get('/:id', asyncHandler(getImage));

module.exports = router;
