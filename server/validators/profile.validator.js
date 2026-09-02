/**
 * NEXORA — profile validators.
 *
 * Mirrors the dependency-free pattern used by auth.validator.js. Each
 * validator returns either null (valid) or a string error message. The
 * shared `validate()` middleware assembles them into the standard
 * envelope.
 *
 * Constants and the editable-field allowlist live in
 * `server/constants/profileFields.js` so the validator and the service
 * share one source of truth.
 */

const mongoose = require('mongoose');

const {
  EDITABLE_PROFILE_FIELDS_SET,
  MAX_HEADLINE_LENGTH,
  MAX_ABOUT_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_CURRENT_POSITION_LENGTH,
  MAX_INDUSTRY_LENGTH,
  MAX_URL_LENGTH,
  URL_PATTERN,
} = require('../constants/profileFields');

function isString(value) {
  return typeof value === 'string';
}

function validateText(field, value, max) {
  if (value === undefined) return null;
  if (!isString(value)) {
    return `${field} must be a string`;
  }
  // Trim before measuring so a value padded with whitespace doesn't
  // falsely trip the length check; the model will trim again on store.
  if (value.trim().length > max) {
    return `${field} must be at most ${max} characters`;
  }
  return null;
}

function validateUrl(field, value, max) {
  if (value === undefined || value === null) return null;
  if (!isString(value)) {
    return `${field} must be a string`;
  }
  if (value.length > max) {
    return `${field} URL is too long`;
  }
  if (!URL_PATTERN.test(value.trim())) {
    return `${field} must be an http(s) URL`;
  }
  return null;
}

/**
 * Validate a PATCH /profile/me body.
 *
 * Rejects any field outside the shared allowlist explicitly (not silently
 * stripped), enforces per-field length / type / URL scheme rules, and
 * refuses empty bodies so clients get a clear "must include a field"
 * error instead of a silent no-op 200.
 */
function validateProfileUpdatePayload(body) {
  const errors = {};
  const source = body && typeof body === 'object' ? body : {};

  const providedFields = Object.keys(source).filter((k) =>
    EDITABLE_PROFILE_FIELDS_SET.has(k)
  );

  if (providedFields.length === 0) {
    errors._body = 'Request body must include at least one editable field';
  }

  for (const key of Object.keys(source)) {
    if (!EDITABLE_PROFILE_FIELDS_SET.has(key)) {
      errors[key] = `${key} is not editable`;
    }
  }

  if (source.headline !== undefined) {
    const e = validateText('headline', source.headline, MAX_HEADLINE_LENGTH);
    if (e) errors.headline = e;
  }
  if (source.about !== undefined) {
    const e = validateText('about', source.about, MAX_ABOUT_LENGTH);
    if (e) errors.about = e;
  }
  if (source.location !== undefined) {
    const e = validateText('location', source.location, MAX_LOCATION_LENGTH);
    if (e) errors.location = e;
  }
  if (source.currentPosition !== undefined) {
    const e = validateText(
      'currentPosition',
      source.currentPosition,
      MAX_CURRENT_POSITION_LENGTH
    );
    if (e) errors.currentPosition = e;
  }
  if (source.industry !== undefined) {
    const e = validateText('industry', source.industry, MAX_INDUSTRY_LENGTH);
    if (e) errors.industry = e;
  }
  if (source.profilePhoto !== undefined) {
    const e = validateUrl('profilePhoto', source.profilePhoto, MAX_URL_LENGTH);
    if (e) errors.profilePhoto = e;
  }
  if (source.coverPhoto !== undefined) {
    const e = validateUrl('coverPhoto', source.coverPhoto, MAX_URL_LENGTH);
    if (e) errors.coverPhoto = e;
  }

  return errors;
}

/**
 * Validate a `:userId` URL parameter on the public profile route.
 * Returns an errors object that `validateParams()` middleware can
 * assemble. Receives the whole `req.params` (not just the string) — the
 * middleware contract matches `validate` for body, which also passes the
 * whole `req.body`.
 */
function validateUserIdParam(req) {
  const userId = req && req.userId;
  if (typeof userId !== 'string' || !mongoose.Types.ObjectId.isValid(userId)) {
    return { userId: 'Invalid user id' };
  }
  return {};
}

module.exports = {
  validateProfileUpdatePayload,
  validateUserIdParam,
};
