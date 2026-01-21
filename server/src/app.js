const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const { env } = require('./config/env');
const { apiRateLimiter } = require('./middlewares/rateLimiter');
const { errorHandler } = require('./middlewares/errorHandler');

const imageRoutes = require('./routes/imageRoutes');

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

// JSON is mostly for non-upload routes
app.use(express.json({ limit: '1mb' }));

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
