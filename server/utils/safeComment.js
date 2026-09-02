/**
 * NEXORA — safe comment serializer.
 *
 * Mirrors safeConnection / safePost. The author block is the same
 * shape as the Post author block: `{ user, profile, placeholder }`.
 * Missing authors surface as `placeholder: true` rather than throwing
 * — consistent with the existing project convention.
 */

const COMMENT_FIELDS = ['id', 'content', 'createdAt', 'updatedAt'];

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

function toSafeComment(comment, participantMap) {
  if (!comment) return null;
  const obj =
    typeof comment.toJSON === 'function' ? comment.toJSON() : { ...comment };

  const authorId =
    obj.author?.toString?.() ?? (obj.author ? String(obj.author) : '');

  const map = participantMap instanceof Map ? participantMap : new Map();

  const safe = {};
  for (const key of COMMENT_FIELDS) {
    if (obj[key] !== undefined) safe[key] = obj[key];
  }

  safe.id = obj.id ?? obj._id?.toString?.() ?? null;
  safe.author = buildAuthor(map.get(authorId));
  return safe;
}

function toSafeCommentList(comments, participantMap) {
  return comments.map((c) => toSafeComment(c, participantMap));
}

module.exports = {
  toSafeComment,
  toSafeCommentList,
  COMMENT_FIELDS,
};
