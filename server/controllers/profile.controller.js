/**
 * NEXORA — profile controller.
 *
 * Thin HTTP layer over the profile service. No business logic, no
 * password or JWT handling, no field whitelisting (the validator + service
 * own those concerns). Errors are forwarded to the centralized error
 * middleware.
 */

const ApiResponse = require('../utils/ApiResponse');
const { toSafeProfile, toPublicProfile } = require('../utils/safeProfile');
const profileService = require('../services/profile.service');

/**
 * Build the public display name from a User document.
 * Falls back to an empty string if the user is missing fields.
 */
function publicUser(user) {
  if (!user) return null;
  const firstName = user.firstName ?? '';
  const lastName = user.lastName ?? '';
  return {
    id: user._id?.toString?.() ?? user.id ?? null,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
  };
}

/**
 * GET /api/v1/profile/me
 *
 * Authenticated. Lazily creates the caller's empty profile on first
 * access; returns 201 on creation, 200 on subsequent reads.
 */
async function getMyProfile(req, res, next) {
  try {
    const { profile, created } = await profileService.getMyProfile(req.user.id);
    res
      .status(created ? 201 : 200)
      .json(
        new ApiResponse(
          created ? 201 : 200,
          created ? 'Profile created' : 'Profile retrieved',
          { profile: toSafeProfile(profile) }
        )
      );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/profile/me
 *
 * Authenticated. Body is whitelisted by the validator and service.
 * Returns 201 on first-time edit, 200 on subsequent edits.
 */
async function updateMyProfile(req, res, next) {
  try {
    const { profile, created } = await profileService.updateMyProfile(
      req.user.id,
      req.body
    );
    res
      .status(created ? 201 : 200)
      .json(
        new ApiResponse(
          created ? 201 : 200,
          created ? 'Profile created' : 'Profile updated',
          { profile: toSafeProfile(profile) }
        )
      );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/profile/:userId
 *
 * Public. Returns the public-safe profile (no updatedAt) plus the user's
 * display name so the caller doesn't need a second request. The userId is
 * the authenticated User's id, not the Profile's id — this is
 * intentional because users think of profiles as belonging to people,
 * not to internal documents.
 */
async function getProfileByUserId(req, res, next) {
  try {
    const { profile, user } = await profileService.getProfileByUserId(
      req.params.userId
    );
    res.status(200).json(
      new ApiResponse(200, 'Profile retrieved', {
        profile: toPublicProfile(profile),
        user: publicUser(user),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  getProfileByUserId,
};
