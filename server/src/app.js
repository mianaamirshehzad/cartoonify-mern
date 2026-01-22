const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { env } = require('./config/env');
const { apiRateLimiter } = require('./middlewares/rateLimiter');
const { errorHandler } = require('./middlewares/errorHandler');
const { requestContext } = require('./middlewares/requestContext');

const imageRoutes = require('./routes/imageRoutes');
const cartoonRoutes = require('./routes/cartoonRoutes');

const app = express();

app.disable('x-powered-by');
app.use(
  helmet({
    // The client (Vite/WordPress) loads processed PNGs from the API origin.
    // Helmet defaults to `same-origin`, which blocks cross-origin embedding of images.
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Attach a request id for easier correlation in logs
app.use(requestContext);

// JSON is mostly for non-upload routes
// Base64 images can be large; keep this reasonably high for Cloudinary uploads.
app.use(express.json({ limit: '15mb' }));

// CORS: allow listed origins; if none provided, allow all (useful for local dev)
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser clients
      if (!env.corsOrigins.length) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    },
    credentials: false
  })
);

// Rate limit API
app.use('/api', apiRateLimiter);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'cartoonify-api', time: new Date().toISOString() });
});

// Cloudinary cartoonify (JSON base64 or URL)
app.use('/api', cartoonRoutes);

app.use('/api/images', imageRoutes);

// Serve processed files
app.use(
  '/static/processed',
  express.static(path.resolve(__dirname, '..', env.processedDir), {
    fallthrough: false,
    maxAge: env.nodeEnv === 'production' ? '7d' : 0
  })
);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

module.exports = { app };
