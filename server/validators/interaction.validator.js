/**
 * NEXORA — interaction validators.
 *
 * Mirrors the dependency-free pattern used by auth/profile/connection
 * validators. Each validator returns an errors object that the shared
 * `validate` / `validateParams` middleware assembles into the standard
 * envelope.
 *
 * Path-parameter validators receive the whole `req.params` and extract
 * their specific parameter — matching the `validate` (body) pattern.
 */

const mongoose = require('mongoose');

const { MAX_CONTENT_LENGTH } = require('../models/Comment');

function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

function validatePostIdParam(req) {
  const postId = req && req.postId;
  if (!isValidObjectId(postId)) {
    return { postId: 'Invalid post id' };
  }
  return {};
}

function validateCommentIdParam(req) {
  const commentId = req && req.commentId;
  if (!isValidObjectId(commentId)) {
    return { commentId: 'Invalid comment id' };
  }
  return {};
}

/**
 * Validate the body for POST /api/v1/posts/:postId/comments.
 *
 * Requires a single `content` field. The same trimming + max-length
 * rules as the comment model enforce are applied here so the validator
 * fails fast before any DB hit.
 */
function validateCommentCreatePayload(body) {
  const errors = {};
  const source = body && typeof body === 'object' ? body : {};
  const raw = source.content;
  if (typeof raw !== 'string') {
    errors.content = 'Content is required.';
    return errors;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    errors.content = 'Content cannot be empty.';
    return errors;
  }
  if (trimmed.length > MAX_CONTENT_LENGTH) {
    errors.content = `Content must be at most ${MAX_CONTENT_LENGTH} characters.`;
  }
  return errors;
}

function validateCommentUpdatePayload(body) {
  return validateCommentCreatePayload(body);
}

module.exports = {
  validatePostIdParam,
  validateCommentIdParam,
  validateCommentCreatePayload,
  validateCommentUpdatePayload,
};
