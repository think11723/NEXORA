/**
 * NEXORA — authentication middleware.
 *
 * Reads `Authorization: Bearer <token>`, verifies the JWT, loads the
 * referenced user, and attaches it to `req.user`.
 *
 * Failure modes all resolve to 401 with a safe message — never the raw
 * jsonwebtoken error text.
 */

const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

const BEARER_PREFIX = /^Bearer\s+(.+)$/i;

function extractToken(req) {
  const header = req.headers && req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(BEARER_PREFIX);
  return match ? match[1].trim() : null;
}

/**
 * `requireAuth` — gates a route behind a valid Bearer token.
 *
 * Populates `req.user` as a Mongoose document (password hash excluded).
 */
async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      throw ApiError.unauthorized('Authentication required');
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      throw ApiError.unauthorized('Authentication required');
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      throw ApiError.unauthorized('Authentication required');
    }
    if (user.isActive === false) {
      throw ApiError.forbidden('Account is disabled');
    }

    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
