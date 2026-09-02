const ApiError = require('../utils/ApiError');

/**
 * Catch-all 404 for any route that wasn't matched by the router.
 * Mounted after all routes in app.js.
 */
function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

module.exports = notFoundHandler;
