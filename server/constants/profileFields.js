/**
 * NEXORA — shared profile constants.
 *
 * Single source of truth for editable profile fields and their length /
 * type bounds. Imported by the model, the validator, and the service so
 * the allowlists cannot drift.
 */

const EDITABLE_PROFILE_FIELDS = Object.freeze([
  'headline',
  'about',
  'location',
  'currentPosition',
  'industry',
  'profilePhoto',
  'coverPhoto',
]);

const EDITABLE_PROFILE_FIELDS_SET = new Set(EDITABLE_PROFILE_FIELDS);

const MAX_HEADLINE_LENGTH = 120;
const MAX_ABOUT_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 120;
const MAX_CURRENT_POSITION_LENGTH = 120;
const MAX_INDUSTRY_LENGTH = 120;
const MAX_URL_LENGTH = 2048;

// Only http(s) URLs are accepted. javascript: / data: / file: would let
// a malicious user store a payload that becomes stored-XSS the moment the
// value lands in an href/src attribute.
const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

module.exports = {
  EDITABLE_PROFILE_FIELDS,
  EDITABLE_PROFILE_FIELDS_SET,
  MAX_HEADLINE_LENGTH,
  MAX_ABOUT_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_CURRENT_POSITION_LENGTH,
  MAX_INDUSTRY_LENGTH,
  MAX_URL_LENGTH,
  URL_PATTERN,
};
