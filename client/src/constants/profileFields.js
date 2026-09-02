/**
 * NEXORA — profile field constants (client).
 *
 * Mirrors the backend limits in `server/constants/profileFields.js`.
 * Frontend validation here is for UX only — the backend is the
 * authoritative validator.
 */

export const MAX_HEADLINE_LENGTH = 120;
export const MAX_ABOUT_LENGTH = 2000;
export const MAX_LOCATION_LENGTH = 120;
export const MAX_CURRENT_POSITION_LENGTH = 120;
export const MAX_INDUSTRY_LENGTH = 120;
export const MAX_URL_LENGTH = 2048;

// http(s) only — matches the backend. Prevents accidental javascript:
// or data: payloads from entering the UI.
export const URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export const EDITABLE_PROFILE_FIELDS = [
  'headline',
  'about',
  'location',
  'currentPosition',
  'industry',
  'profilePhoto',
  'coverPhoto',
];
