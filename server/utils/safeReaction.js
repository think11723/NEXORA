/**
 * NEXORA — safe reaction serializer.
 *
 * The Reaction document is small. The safe projection keeps the id,
 * post, user, type, and timestamps — nothing else. Sensitive fields
 * don't live on Reaction so there is nothing extra to redact, but the
 * allowlist pattern is preserved for future-proofing.
 */

const REACTION_FIELDS = ['id', 'post', 'user', 'type', 'createdAt'];

function toSafeReaction(reaction) {
  if (!reaction) return null;
  const obj =
    typeof reaction.toJSON === 'function' ? reaction.toJSON() : { ...reaction };

  const safe = {};
  for (const key of REACTION_FIELDS) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }
  safe.id = obj.id ?? obj._id?.toString?.() ?? null;
  return safe;
}

module.exports = {
  toSafeReaction,
  REACTION_FIELDS,
};
