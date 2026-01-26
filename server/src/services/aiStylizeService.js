const fs = require('fs');
const { env } = require('../config/env');
const { logger } = require('../utils/logger');

function ensureAiStyleConfigured() {
  if (!env.aiStyleApiUrl) {
    throw new Error(
      'AI Pixar-style is not configured. Set AI_STYLE_API_URL (and optionally AI_STYLE_API_KEY) on the server.'
    );
  }
}

function defaultPixarPrompt() {
  // This is a *prompt for external AI stylization providers* (not Cloudinary).
  return (
    'A high-quality 3D digital animation style portrait, reminiscent of modern feature film character designs. ' +
    'Preserve the person’s identity and facial structure. ' +
    'Large expressive eyes, soft cinematic lighting, stylized semi-realistic textures, ' +
    'rosy cheeks, subtle freckles, highly detailed voluminous hair, clean vibrant colors, ' +
    'hand-painted 3D render feel, plain white background. ' +
    'No text, no watermark, no artifacts.'
  );
}

function normalizeAiResponse(json) {
  // Preferred contract:
  // - { imageUrl: "https://..." } OR { imageBase64: "data:image/png;base64,..." } OR { imageBase64: "<base64>" }
  if (json?.imageUrl && typeof json.imageUrl === 'string') return { imageUrl: json.imageUrl };

  if (json?.imageBase64 && typeof json.imageBase64 === 'string') {
    const v = json.imageBase64.trim();
    if (v.startsWith('data:')) return { imageDataUri: v };
    return { imageDataUri: `data:image/png;base64,${v}` };
  }

  // OpenAI-like contracts (common shapes)
  const first = Array.isArray(json?.data) ? json.data[0] : null;
  if (first?.url && typeof first.url === 'string') return { imageUrl: first.url };
  if (first?.b64_json && typeof first.b64_json === 'string') {
    return { imageDataUri: `data:image/png;base64,${first.b64_json}` };
  }

  throw new Error(
    'AI style API returned an unexpected response. Expected {imageUrl} or {imageBase64} (or OpenAI-like {data:[{url|b64_json}]})'
  );
}

function fileToDataUri(filePath, mimetype = 'image/png') {
  const buf = fs.readFileSync(filePath);
  const b64 = buf.toString('base64');
  const safeType = mimetype || 'image/png';
  return `data:${safeType};base64,${b64}`;
}

async function callAiStyleApi({ imageDataUri, style, requestId }) {
  ensureAiStyleConfigured();

  const prompt = env.aiStylePromptPixar3d || defaultPixarPrompt();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.aiStyleTimeoutMs);

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (env.aiStyleApiKey) headers.Authorization = `Bearer ${env.aiStyleApiKey}`;

    const res = await fetch(env.aiStyleApiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        style,
        prompt,
        image: imageDataUri
      }),
      signal: controller.signal
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message || json?.error || `AI style request failed (HTTP ${res.status})`;
      throw new Error(msg);
    }

    return normalizeAiResponse(json);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Pixar-style (AI) pipeline:
 * 1) call external AI style API (env-guarded)
 * 2) return either an image URL or a data URI (caller can upload to Cloudinary)
 */
async function stylizePixar3d({ imagePathOrDataUri, filePath, fileMimetype, requestId }) {
  const style = 'pixar_3d';
  const imageDataUri =
    imagePathOrDataUri && typeof imagePathOrDataUri === 'string'
      ? imagePathOrDataUri
      : filePath
        ? fileToDataUri(filePath, fileMimetype)
        : null;

  if (!imageDataUri) throw new Error('Missing input image for AI stylization.');

  logger.info('ai_style.request', { requestId, style, hasApiUrl: Boolean(env.aiStyleApiUrl) });

  return callAiStyleApi({ imageDataUri, style, requestId });
}

module.exports = { stylizePixar3d };


