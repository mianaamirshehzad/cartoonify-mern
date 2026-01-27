const path = require('path');
const dotenv = require('dotenv');

// Load env vars from either location (supports running from repo root or from /server).
// - server: <repo>/server/.env
// - repo root: <repo>/.env
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });
// Fallback for this repo's local template (useful when .env files are blocked in some environments)
dotenv.config({ path: path.resolve(__dirname, '..', 'env.template') });

const http = require('http');
const { app } = require('./app');
const { env } = require('./config/env');
const { connectDb } = require('./config/db');

async function main() {
  try {
    await connectDb(env.mongodbUri);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `Warning: could not connect to MongoDB (${env.mongodbUri}). ` +
        'Continuing without DB persistence for local testing.'
    );
  }

  const server = http.createServer(app);

  // Graceful timeouts (helps avoid hanging uploads on cheap hosts)
  server.requestTimeout = 60_000;
  server.headersTimeout = 65_000;

  server.on('error', (err) => {
    // Prevent unhandled 'error' events from crashing nodemon without a useful message.
    // eslint-disable-next-line no-console
    console.error('Server error:', err?.code || err?.message || err);
    if (err?.code === 'EADDRINUSE') {
      // eslint-disable-next-line no-console
      console.error(`Port ${env.port} is already in use. Stop the other process or change PORT.`);
    }
    process.exit(1);
  });

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${env.publicBaseUrl} (port ${env.port})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
