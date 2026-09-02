/**
 * NEXORA — safe user serializer.
 *
 * Centralizes the public shape of a User. Anything that returns a user to
 * an API client MUST go through this function (or rely on the model's
 * `toJSON` transform), so future field additions default to private.
 */

const DEFAULT_PUBLIC_FIELDS = [
  'id',
  'firstName',
  'lastName',
  'email',
  'role',
  'isActive',
  'createdAt',
  'updatedAt',
];

function toSafeUser(user) {
  if (!user) return null;
  // Prefer Mongoose document's toJSON() result, then project the
  // explicit allowlist as a defense-in-depth layer.
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };

  const safe = {};
  for (const key of DEFAULT_PUBLIC_FIELDS) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }
  return safe;
}

module.exports = { toSafeUser };
