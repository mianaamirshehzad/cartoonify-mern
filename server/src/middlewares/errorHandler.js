/* eslint-disable no-unused-vars */

function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // Multer file upload errors
  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File too large'
      : 'Upload failed';
    return res.status(400).json({ error: message, code: err.code });
  }

  const message = status >= 500
    ? 'Server error'
    : (err.message || 'Request failed');

  if (process.env.NODE_ENV !== 'production') {
    // Helpful details in dev
    return res.status(status).json({
      error: message,
      details: err.message,
      stack: err.stack
    });
  }

  return res.status(status).json({ error: message });
}

module.exports = { errorHandler };
