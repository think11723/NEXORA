/**
 * NEXORA — post validators.
 *
 * Mirrors the dependency-free pattern used by auth.validator.js,
 * profile.validator.js, and connection.validator.js. Each validator
 * returns an errors object that the shared `validate` /
 * `validateParams` middleware assembles into the standard envelope.
 *
 * Path-parameter validators receive the whole `req.params` (or
 * `req.query`) and extract their specific parameter — matching the
 * `validate` (body) pattern. This signature was fixed in Phase 4 Prompt
 * 2 after a critical bug, so all validators here use the same shape.
 */

const mongoose = require('mongoose');

const { MAX_CONTENT_LENGTH } = require('../models/Post');

function isValidObjectId(value) {
  return typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);
}

/**
 * Validate the body for POST /api/v1/posts.
 *
 * Requires a single `content` field that, once trimmed, has at least
 * one non-whitespace character and is at most MAX_CONTENT_LENGTH.
 */
function validatePostCreatePayload(body) {
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

/**
 * Validate the body for PATCH /api/v1/posts/:postId.
 *
 * Same rules as create; the existing content is overwritten with the
 * trimmed value if validation passes.
 */
function validatePostUpdatePayload(body) {
  return validatePostCreatePayload(body);
}

function validatePostIdParam(req) {
  const postId = req && req.postId;
  if (!isValidObjectId(postId)) {
    return { postId: 'Invalid post id' };
  }
  return {};
}

function validateUserIdParam(req) {
  const userId = req && req.userId;
  if (!isValidObjectId(userId)) {
    return { userId: 'Invalid user id' };
  }
  return {};
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * Validate `?page=&limit=` query parameters for paginated list endpoints.
 *
 * Coerces strings to numbers; rejects NaN / negative / non-integer / out-
 * of-range values; clamps to sensible defaults. Returns a normalized
 * pagination descriptor the service can use directly.
 */
function validatePaginationQuery(query) {
  const errors = {};
  const source = query && typeof query === 'object' ? query : {};

  let page = Number.parseInt(source.page, 10);
  if (!Number.isFinite(page)) page = DEFAULT_PAGE;
  if (!Number.isInteger(page) || page < 1) {
    errors.page = 'Page must be a positive integer.';
  }

  let limit = Number.parseInt(source.limit, 10);
  if (!Number.isFinite(limit)) limit = DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1) {
    errors.limit = 'Limit must be a positive integer.';
  }

  // Clamp silently when above MAX — we never reject an otherwise-valid
  // request just because the client asked for too many items.
  const effectiveLimit = Math.min(
    Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  return {
    errors,
    values: {
      page: errors.page ? DEFAULT_PAGE : page,
      limit: errors.limit ? DEFAULT_LIMIT : effectiveLimit,
    },
  };
}

module.exports = {
  validatePostCreatePayload,
  validatePostUpdatePayload,
  validatePostIdParam,
  validateUserIdParam,
  validatePaginationQuery,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
