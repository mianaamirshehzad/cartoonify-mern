require('dotenv').config();

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

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on ${env.publicBaseUrl} (port ${env.port})`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
