const ApiResponse = require('../utils/ApiResponse');

/**
 * GET /api/v1/health
 *
 * Liveness probe. Reports process uptime and current server time so the
 * response carries information beyond a static string.
 */
function getHealth(_req, res) {
  const payload = {
    service: 'nexora-api',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(200).json(new ApiResponse(200, 'NEXORA API is running', payload));
}

module.exports = { getHealth };
