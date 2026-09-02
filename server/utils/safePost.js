/**
 * NEXORA — safe post serializer.
 *
 * Post documents are never returned raw. The serializer projects the
 * document down to the public surface and populates a small author
 * block (user identity + profile preview) so a feed/post card can
 * render without a second round-trip.
 *
 * `author` itself is the rich block the brief specifies:
 *
 *   author: {
 *     user: { id, firstName, lastName, fullName },
 *     profile: { headline, profilePhoto },
 *     placeholder: true | false
 *   }
 *
 * Sensitive User fields (password, role, isActive, email) and the full
 * Profile document are NEVER returned. The author's id lives at
 * `author.user.id`.
 *
 * Missing-author policy: if a referenced User has been removed, the
 * serializer returns a placeholder rather than throwing. This is a
 * data-integrity safety net consistent with safeConnection. We do NOT
 * fabricate a fake name.
 *
 * `interaction` summary:
 *   - `likeCount`   — total reactions on the post (any type)
 *   - `likedByMe`   — whether the requesting caller liked the post
 *   - `commentCount` — total comments on the post
 *
 * The summary is computed in batched aggregations by the post service
 * (one Reaction.aggregate + one Comment.aggregate + one per-caller
 * Reaction.find) — not per-post. See server/services/post.service.js.
 */

const POST_FIELDS = ['id', 'content', 'visibility', 'createdAt', 'updatedAt'];

function userPublicProjection(user) {
  if (!user) return null;
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
  const firstName = obj.firstName ?? '';
  const lastName = obj.lastName ?? '';
  return {
    id: obj._id?.toString?.() ?? obj.id ?? null,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
  };
}

function profilePublicProjection(profile) {
  if (!profile) return null;
  const obj =
    typeof profile.toJSON === 'function' ? profile.toJSON() : { ...profile };
  return {
    headline: obj.headline ?? '',
    profilePhoto: obj.profilePhoto ?? null,
  };
}

function buildAuthor(participant) {
  if (!participant || !participant.user) {
    return {
      user: null,
      profile: null,
      placeholder: true,
    };
  }
  return {
    user: userPublicProjection(participant.user),
    profile: profilePublicProjection(participant.profile),
    placeholder: false,
  };
}

const DEFAULT_INTERACTION = Object.freeze({
  likeCount: 0,
  likedByMe: false,
  commentCount: 0,
});

function normalizeInteraction(summary) {
  if (!summary || typeof summary !== 'object')
    return { ...DEFAULT_INTERACTION };
  return {
    likeCount: Number.isFinite(summary.likeCount) ? summary.likeCount : 0,
    likedByMe: Boolean(summary.likedByMe),
    commentCount: Number.isFinite(summary.commentCount)
      ? summary.commentCount
      : 0,
  };
}

/**
 * Project a Post document into its API shape.
 *
 * `participantMap` is a Map<userId, { user, profile }>. Missing authors
 * surface as `{ placeholder: true }` so the feed / detail page can
 * render a graceful fallback instead of crashing the entire list.
 *
 * `interactionSummary` is optional — when omitted (e.g. legacy code
 * paths), the safe post still renders, with zeroed counts and
 * `likedByMe: false`.
 */
function toSafePost(post, participantMap, interactionSummary) {
  if (!post) return null;
  const obj = typeof post.toJSON === 'function' ? post.toJSON() : { ...post };

  const authorId =
    obj.author?.toString?.() ?? (obj.author ? String(obj.author) : '');

  const map = participantMap instanceof Map ? participantMap : new Map();

  const safe = {};
  for (const key of POST_FIELDS) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }

  safe.id = obj.id ?? obj._id?.toString?.() ?? null;
  safe.author = buildAuthor(map.get(authorId));
  safe.interaction = normalizeInteraction(interactionSummary);
  return safe;
}

function toSafePostList(posts, participantMap, interactionSummaries) {
  const map = interactionSummaries instanceof Map ? interactionSummaries : null;
  return posts.map((p) => {
    const id = p ? String(p._id) : null;
    const summary = map && id ? map.get(id) : null;
    return toSafePost(p, participantMap, summary);
  });
}

module.exports = {
  toSafePost,
  toSafePostList,
  POST_FIELDS,
};
