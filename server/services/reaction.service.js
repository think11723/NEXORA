/**
 * NEXORA — reaction service.
 *
 * Lifecycle for the one supported reaction type ('like'):
 *   - likePost(postId, userId)        — idempotent
 *   - unlikePost(postId, userId)      — idempotent
 *   - getSummaryForPosts(postIds, userId)
 *       → { [postId]: { count, likedByMe } } in ONE aggregation per
 *         collection, not one per post. This is the only N+1 prevention
 *         story the Feed depends on.
 *
 * Concurrency: the unique compound index on (post, user, type) lets
 * MongoDB serialize simultaneous likes from the same user. The loser
 * receives E11000 which we translate to a clean idempotent success so
 * the frontend never has to know which insert "won".
 */

const Reaction = require('../models/Reaction');
const ApiError = require('../utils/ApiError');

const REACTION_TYPE = Reaction.REACTION_TYPE.LIKE;

function isDuplicateKeyError(err) {
  return Boolean(err && err.code === 11000);
}

async function assertPostExists(postId) {
  // Avoid a hard import cycle with post.service by using mongoose's
  // model registry directly. The Post model is loaded elsewhere and
  // registers itself with mongoose.
  const Post = require('../models/Post');
  const exists = await Post.exists({ _id: postId });
  if (!exists) throw ApiError.notFound('Post not found');
}

/**
 * Like a post. Idempotent: a duplicate like returns the existing
 * document with `created: false` so the caller can distinguish new vs
 * repeated without an extra round-trip.
 */
async function likePost(postId, userId) {
  await assertPostExists(postId);
  try {
    const doc = await Reaction.create({
      post: postId,
      user: userId,
      type: REACTION_TYPE,
    });
    return { reaction: doc, created: true };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      const existing = await Reaction.findOne({
        post: postId,
        user: userId,
        type: REACTION_TYPE,
      });
      return { reaction: existing, created: false };
    }
    throw err;
  }
}

/**
 * Unlike a post. Idempotent: removing when not present returns
 * `{ removed: false }`. The frontend uses this to keep Redux in sync
 * without ambiguity.
 */
async function unlikePost(postId, userId) {
  const result = await Reaction.deleteOne({
    post: postId,
    user: userId,
    type: REACTION_TYPE,
  });
  return { removed: result.deletedCount > 0 };
}

/**
 * Aggregate reaction summary for a batch of posts in a SINGLE MongoDB
 * query — prevents N+1.
 *
 * Returns a map keyed by postId:
 *   { [postId]: { count, likedByMe } }
 *
 * `likedByMe` is computed in a second small query that targets only
 * this user — also one round-trip per batch.
 */
async function getSummaryForPosts(postIds, userId) {
  const ids = [...new Set(postIds.filter(Boolean))].map(String);
  const map = {};
  if (ids.length === 0) return map;

  // Total likes per post (one aggregation).
  const counts = await Reaction.aggregate([
    { $match: { post: { $in: ids }, type: REACTION_TYPE } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);
  for (const c of counts) {
    map[String(c._id)] = { count: c.count, likedByMe: false };
  }
  for (const id of ids) {
    if (!map[id]) map[id] = { count: 0, likedByMe: false };
  }

  // My reactions (one query — limited to the postIds in this page).
  const mine = await Reaction.find({
    post: { $in: ids },
    user: userId,
    type: REACTION_TYPE,
  }).select('post -_id');
  for (const r of mine) {
    const id = String(r.post);
    if (map[id]) map[id].likedByMe = true;
  }

  return map;
}

/**
 * Single-post reaction summary — used by the standalone
 * `GET /api/v1/posts/:postId/reactions` endpoint.
 */
async function getSummaryForPost(postId, userId) {
  await assertPostExists(postId);
  const [count, mine] = await Promise.all([
    Reaction.countDocuments({ post: postId, type: REACTION_TYPE }),
    Reaction.exists({ post: postId, user: userId, type: REACTION_TYPE }),
  ]);
  return {
    count: typeof count === 'number' ? count : 0,
    likedByMe: Boolean(mine),
  };
}

module.exports = {
  likePost,
  unlikePost,
  getSummaryForPosts,
  getSummaryForPost,
  REACTION_TYPE,
};
