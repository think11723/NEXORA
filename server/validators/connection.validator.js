/**
 * NEXORA — connection validators.
 *
 * Mirrors the dependency-free pattern used by auth.validator.js and
 * profile.validator.js. Each validator returns an errors object that the
 * shared `validateParams` middleware assembles into the standard
 * envelope.
 *
 * Path-parameter validators receive the whole `req.params` object and
 * extract their specific parameter — matching the `validate` (body)
 * pattern, where validators receive the whole `req.body` and destructure.
 */

const mongoose = require('mongoose');

function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

function validateUserIdParam(req) {
  const userId = req && req.userId;
  if (!isValidObjectId(userId)) {
    return { userId: 'Invalid user id' };
  }
  return {};
}

function validateConnectionIdParam(req) {
  const connectionId = req && req.connectionId;
  if (!isValidObjectId(connectionId)) {
    return { connectionId: 'Invalid connection id' };
  }
  return {};
}

module.exports = {
  validateUserIdParam,
  validateConnectionIdParam,
};
