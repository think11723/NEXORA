const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const apiRouter = require('./routes');
const notFoundHandler = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * Build the Express application.
 *
 * server.js owns the HTTP lifecycle. app.js owns the configuration
 * of middleware, routes, and error handling — kept apart so the
 * app can be tested without binding a real port.
 */
function createApp() {
  const app = express();

  // Security headers — sensible defaults; relaxed CSP in dev so Vite HMR works.
  app.use(
    helmet({
      contentSecurityPolicy: NODE_ENV === 'production',
    })
  );

  // CORS — explicit origin from environment; no wildcard.
  app.use(
    cors({
      origin: CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );

  // Request body parsing.
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Request logging — concise dev format; standard Apache format in prod.
  if (NODE_ENV !== 'test') {
    app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // API root.
  app.get('/api/v1', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'NEXORA API',
      data: {
        name: 'nexora-api',
        version: '0.1.0',
        environment: NODE_ENV,
      },
    });
  });

  // Feature routes.
  app.use('/api/v1', apiRouter);

  // 404 for unknown API paths.
  app.use(notFoundHandler);

  // Centralized error formatter — must be last.
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
