function validateUpload(fieldName) {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ error: `Missing file. Use multipart field name '${fieldName}'.` });
    }
    return next();
  };
}

module.exports = { validateUpload };
