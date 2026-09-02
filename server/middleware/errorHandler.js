const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Centralized error handler.
 *
 * Translates known error types into a consistent JSON envelope
 * and hides stack traces from production clients.
 */
function errorHandler(err, _req, res, _next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message])
    );
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  } else if (err && err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate resource';
    errors = err.keyValue;
  } else if (err && err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  }

  const payload = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };

  if (NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }

  if (statusCode >= 500) {
    console.error('[NEXORA]', err);
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
