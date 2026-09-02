/**
 * NEXORA backend entry point.
 *
 * Loads environment variables, connects to MongoDB, then starts the HTTP
 * server. Keeps process-level concerns (port binding, graceful shutdown,
 * unhandled-rejection logging) out of app.js.
 */

require('dotenv').config();

const { createApp } = require('./app');
const { connectToDatabase } = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Fail fast in production if the JWT secret is missing or weak.
 * In development we warn so the server still boots for /health checks,
 * but auth routes will fail at request time with a clear message.
 */
function ensureJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.length >= 16) return;
  const message =
    '[NEXORA] JWT_SECRET is missing or too short. ' +
    'Define a long random string in server/.env before using /api/v1/auth/*.';
  if (NODE_ENV === 'production') {
    throw new Error(message);
  }
  console.warn(`${message} (warning only in development)`);
}

async function start() {
  ensureJwtSecret();

  const app = createApp();

  // Connect to MongoDB before accepting traffic. If MONGO_URI is missing
  // or unreachable, surface a clear message instead of a cryptic crash.
  try {
    await connectToDatabase(process.env.MONGO_URI);
    console.log('[NEXORA] MongoDB connection established.');
  } catch (err) {
    console.error(`[NEXORA] ${err.message}`);
    if (NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn(
        '[NEXORA] Continuing without a database — only /health will respond.'
      );
    }
  }

  const server = app.listen(PORT, () => {
    console.log(
      `[NEXORA] API listening on http://localhost:${PORT} (${NODE_ENV})`
    );
  });

  // Graceful shutdown.
  const shutdown = (signal) => {
    console.log(`[NEXORA] ${signal} received, shutting down.`);
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    console.error('[NEXORA] Unhandled promise rejection:', reason);
  });
}

start();
