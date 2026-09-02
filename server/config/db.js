/**
 * MongoDB connection lifecycle.
 *
 * Single source of truth for the Mongoose connection.
 * Application code MUST NOT call mongoose.connect() directly.
 */

const mongoose = require('mongoose');

const DEFAULT_OPTIONS = {
  serverSelectionTimeoutMS: 10000,
};

async function connectToDatabase(uri) {
  if (!uri) {
    throw new Error(
      '[NEXORA] MONGO_URI is not set. Define it in server/.env before starting the API.'
    );
  }

  // Quiet the deprecation warning without losing visibility into driver events.
  mongoose.set('strictQuery', true);

  try {
    const connection = await mongoose.connect(uri, DEFAULT_OPTIONS);
    return connection;
  } catch (err) {
    // Surface a clean, actionable error rather than the raw driver stack.
    const reason = err && err.message ? err.message : 'unknown reason';
    throw new Error(`[NEXORA] Failed to connect to MongoDB: ${reason}`);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('[NEXORA] MongoDB connection lost.');
});

module.exports = { connectToDatabase };
