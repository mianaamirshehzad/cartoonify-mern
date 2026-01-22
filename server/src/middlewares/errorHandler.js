/* eslint-disable no-unused-vars */
const { logger } = require('../utils/logger');
const { extractCloudinaryError } = require('../utils/cloudinaryError');

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Multer file upload errors
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large'
      : 'Upload failed';
    logger.warn('upload.multer_error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      code: err.code,
      message: err.message
    });
    return res.status(400).json({ error: message, code: err.code });
  }

  const message = status >= 500
    ? 'Server error'
    : (err.message || 'Request failed');

  // Log all server errors; include Cloudinary shape if present.
  if (status >= 500) {
    logger.error('request.error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      err,
      cloudinary: extractCloudinaryError(err)
    });
  } else {
    logger.warn('request.client_error', {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status,
      err
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    // Helpful details in dev
    return res.status(status).json({
      error: message,
      details: err.message,
      stack: err.stack,
      requestId: req.id
    });
  }

  return res.status(status).json({ error: message, requestId: req.id });
}

module.exports = { errorHandler };
