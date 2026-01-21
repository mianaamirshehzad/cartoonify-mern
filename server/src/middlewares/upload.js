const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png']);

function ensureDir(dirAbs) {
  if (!fs.existsSync(dirAbs)) {
    fs.mkdirSync(dirAbs, { recursive: true });
  }
}

ensureDir(env.uploadAbsDir);
ensureDir(env.processedAbsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.uploadAbsDir);
  },
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(safeBase) || '';
    const nameOnly = safeBase.replace(ext, '').slice(0, 80);
    const finalName = `${Date.now()}-${nameOnly}${ext}`;
    cb(null, finalName);
  }
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(new Error('Only JPG, JPEG, and PNG images are allowed.'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxFileSizeBytes }
});

module.exports = { upload, ALLOWED_MIME };
