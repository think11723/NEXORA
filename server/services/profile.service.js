/**
 * NEXORA — profile service.
 *
 * Owns profile business logic. The controller layer is HTTP-thin and
 * delegates here for reads, writes, and ownership decisions.
 *
 * Profile lifecycle:
 *   - `getMyProfile` uses an atomic upsert keyed by `user`. The unique
 *     index on `user` and the `findOneAndUpdate` upsert make this both
 *     race-free and idempotent — two concurrent first-access requests
 *     converge to a single document.
 *   - `updateMyProfile` distinguishes create from update so the
 *     controller can return 201 on first-time edit, 200 on subsequent
 *     edits.
 *   - `getProfileByUserId` resolves the User first (so 404 means the
 *     user truly does not exist), then returns the Profile or lazily
 *     creates an empty one. The public response includes the user's
 *     display name so clients don't need a second round-trip.
 */

const mongoose = require('mongoose');

const Profile = require('../models/Profile');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { EDITABLE_PROFILE_FIELDS } = require('../constants/profileFields');

function pickUpdateInput(body) {
  const source = body && typeof body === 'object' ? body : {};
  const picked = {};
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

function normalizeText(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}

/**
 * Read the caller's profile. Lazy-creates an empty one if missing, in a
 * single atomic upsert keyed by `user`.
 *
 * Returns `{ profile, created }`. `created` lets the controller emit
 * 201 on first access, 200 on subsequent reads.
 */
async function getMyProfile(userId) {
  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { user: userId } },
    { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
  );
  // `findOneAndUpdate` with upsert doesn't tell us whether it created —
  // distinguish by checking createdAt ≈ updatedAt at the millisecond
  // level (a freshly created doc has them equal to the same instant).
  const created =
    profile.createdAt?.getTime?.() === profile.updatedAt?.getTime?.();
  return { profile, created };
}

/**
 * Update the caller's profile. Whitelists editable fields. Creates the
 * profile on first edit. Returns `{ profile, created }`.
 */
async function updateMyProfile(userId, rawBody) {
  const patch = pickUpdateInput(rawBody);

  // Normalize text fields: trim, empty string stays empty.
  for (const key of [
    'headline',
    'about',
    'location',
    'currentPosition',
    'industry',
  ]) {
    if (key in patch) {
      patch[key] = normalizeText(patch[key]);
    }
  }

  // Normalize media refs: empty string clears; non-empty must be a string.
  for (const key of ['profilePhoto', 'coverPhoto']) {
    if (key in patch) {
      const v = patch[key];
      if (v === null) {
        patch[key] = null;
      } else if (typeof v === 'string') {
        const trimmed = v.trim();
        patch[key] = trimmed === '' ? null : trimmed;
      }
    }
  }

  const profile = await Profile.findOneAndUpdate(
    { user: userId },
    { $set: patch, $setOnInsert: { user: userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  const created =
    profile.createdAt?.getTime?.() === profile.updatedAt?.getTime?.();
  return { profile, created };
}

/**
 * Public profile lookup. Resolves the User first (so a 404 means the
 * user truly does not exist), then returns the Profile, lazily creating
 * an empty one if the User exists but the Profile does not. Includes
 * the user's display name so the public response is self-contained.
 */
async function getProfileByUserId(rawUserId) {
  if (!mongoose.Types.ObjectId.isValid(rawUserId)) {
    throw ApiError.badRequest('Invalid user id');
  }

  const user = await User.findById(rawUserId).select(
    'firstName lastName isActive'
  );
  if (!user) throw ApiError.notFound('Profile not found');

  let profile = await Profile.findOne({ user: rawUserId });
  if (!profile) {
    profile = await Profile.create({ user: rawUserId });
  }

  return { profile, user };
}

module.exports = {
  getMyProfile,
  getProfileByUserId,
  updateMyProfile,
};
