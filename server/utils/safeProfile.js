/**
 * NEXORA — safe profile serializer.
 *
 * The public surface of a Profile is intentionally narrower than the
 * stored document. Field-level allowlists keep new internal columns from
 * leaking through API responses by accident.
 *
 * Two views:
 *   - toSafeProfile(profile): owner or private view (includes updatedAt).
 *   - toPublicProfile(profile): unauthenticated public view (stricter).
 *
 * Both functions strip MongoDB internals (`_id`, `__v`) via the model's
 * toJSON() transform, then re-project through this allowlist as
 * defense-in-depth.
 *
 * `id` (the Profile document's own _id) is intentionally NOT exposed —
 * every Profile is identified by its parent `user` id from the API
 * consumer's perspective.
 */

const OWNER_FIELDS = [
  'user',
  'headline',
  'about',
  'location',
  'currentPosition',
  'industry',
  'profilePhoto',
  'coverPhoto',
  'createdAt',
  'updatedAt',
];

const PUBLIC_FIELDS = [
  'user',
  'headline',
  'about',
  'location',
  'currentPosition',
  'industry',
  'profilePhoto',
  'coverPhoto',
  'createdAt',
];

function project(profile, allowlist) {
  if (!profile) return null;
  const obj =
    typeof profile.toJSON === 'function' ? profile.toJSON() : { ...profile };

  const safe = {};
  for (const key of allowlist) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }
  return safe;
}

function toSafeProfile(profile) {
  return project(profile, OWNER_FIELDS);
}

function toPublicProfile(profile) {
  return project(profile, PUBLIC_FIELDS);
}

module.exports = {
  toSafeProfile,
  toPublicProfile,
  OWNER_FIELDS,
  PUBLIC_FIELDS,
};
