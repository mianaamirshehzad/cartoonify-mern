const path = require('path');

function requireEnv(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

function toInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseOrigins(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 5050),

  mongodbUri: requireEnv('MONGODB_URI', 'mongodb://localhost:27017/cartoonify'),

  publicBaseUrl: requireEnv('PUBLIC_BASE_URL', 'http://localhost:5050').replace(/\/$/, ''),
  corsOrigins: parseOrigins(process.env.CORS_ORIGIN),

  uploadFieldName: requireEnv('UPLOAD_FIELD_NAME', 'image'),
  maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024),

  // Stored relative to server/ (project root for the API)
  uploadDir: requireEnv('UPLOAD_DIR', 'uploads'),
  processedDir: requireEnv('PROCESSED_DIR', 'processed'),

  // Cloudinary (cartoonify)
  cloudinaryCloudName: requireEnv('CLOUDINARY_CLOUD_NAME', null),
  cloudinaryApiKey: requireEnv('CLOUDINARY_API_KEY', null),
  cloudinaryApiSecret: requireEnv('CLOUDINARY_API_SECRET', null),

  // Optional external AI stylization (Pixar-style)
  // If not set, the "pixar_3d" style will return a helpful 400/500 error.
  aiStyleApiUrl: requireEnv('AI_STYLE_API_URL', null),
  aiStyleApiKey: requireEnv('AI_STYLE_API_KEY', null),
  aiStyleTimeoutMs: toInt(process.env.AI_STYLE_TIMEOUT_MS, 120_000),
  aiStylePromptPixar3d: requireEnv('AI_STYLE_PROMPT_PIXAR_3D', null)
};

env.uploadAbsDir = path.resolve(__dirname, '..', '..', env.uploadDir);
env.processedAbsDir = path.resolve(__dirname, '..', '..', env.processedDir);

env.rateLimitWindowMs = toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
env.rateLimitMax = toInt(process.env.RATE_LIMIT_MAX, 30);

module.exports = { env };
