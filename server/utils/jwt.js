/**
 * NEXORA — JWT utility.
 *
 * Single point for signing and verifying authentication tokens.
 *
 * Design:
 *   - Payload is intentionally minimal: only the user id.
 *   - Secret and expiration come from the environment, not the codebase.
 *   - The server refuses to start when JWT is required and JWT_SECRET is
 *     absent — never a hardcoded fallback secret.
 */

const jwt = require('jsonwebtoken');
const ApiError = require('./ApiError');

const DEFAULT_EXPIRES_IN = '7d';

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    // Hard fail. No fallback secret, ever.
    throw new Error(
      '[NEXORA] JWT_SECRET is not set or is too short. ' +
        'Define a long random string in server/.env before using auth routes.'
    );
  }
  return secret;
}

function getExpiresIn() {
  return process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN;
}

/**
 * Sign a JWT for the given user id.
 *
 * @param {string} userId - the user's database id (string form).
 * @returns {string} signed JWT
 */
function signToken(userId) {
  return jwt.sign({ userId }, getSecret(), {
    expiresIn: getExpiresIn(),
    issuer: 'nexora-api',
  });
}

/**
 * Verify a JWT and return its payload, or throw an ApiError(401).
 *
 * Translates every jsonwebtoken failure mode into a uniform 401 so
 * downstream error handlers never leak the underlying driver message.
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret(), { issuer: 'nexora-api' });
  } catch (_err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

module.exports = {
  signToken,
  verifyToken,
};
