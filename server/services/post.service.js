/**
 * NEXORA — post service.
 *
 * Owns the post lifecycle and the feed query. Controllers are thin;
 * routes authenticate + validate; this service decides ownership,
 * pagination, and feed eligibility.
 *
 * Feed architecture:
 *   1. Find accepted connection ids for the caller in ONE query.
 *   2. Combine caller id + connection ids into a small author-id set.
 *   3. Run ONE post query with `$in: authorIds`, paginated + sorted at
 *      the database level.
 *   No N+1 pattern. No per-connection subqueries.
 *
 * Concurrency:
 *   - Edit / delete use atomic ownership-aware queries
 *     (`findOneAndUpdate` / `findOneAndDelete` with author + status).
 *     A user cannot modify another user's post by manipulating an id;
 *     the database rejects non-matching documents.
 *   - Concurrent edits: the second writer's findOneAndUpdate simply
 *     matches the same document and overwrites. The post stays
 *     consistent (last-write-wins). No transaction needed.
 *   - Concurrent delete + edit: one wins; the other matches 0
 *     documents and returns 404.
 *
 * Visibility: only `public` exists today. Future visibility values
 * (connections-only, etc.) will extend the find clauses without
 * changing this signature.
 */

const Post = require('../models/Post');
const User = require('../models/User');
const Profile = require('../models/Profile');
const Connection = require('../models/Connection');
const ApiError = require('../utils/ApiError');
const reactionService = require('./reaction.service');
const commentService = require('./comment.service');

const STATUS = Connection.STATUS;

/**
 * Compute pagination metadata given the page, limit, and total.
 */
function buildPagination({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && total > 0,
  };
}

/**
 * Sort spec used by every list endpoint.
 *   primary: createdAt desc
 *   tie-break: _id desc (ObjectId is roughly monotonic; this is stable
 *   even for same-millisecond inserts and matches the compound indexes)
 */
const POST_SORT = { createdAt: -1, _id: -1 };

function normalizeContent(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

/**
 * Create a new post authored by `authorId`. The author is always the
 * authenticated caller; the request body cannot override it.
 */
async function createPost(authorId, rawBody) {
  const content = normalizeContent(rawBody?.content);
  if (content.length === 0) {
    throw ApiError.badRequest('Content cannot be empty.');
  }

  // Re-check the model length cap so a malicious client can't bypass
  // the validator by sending a string the validator already trimmed.
  const { MAX_CONTENT_LENGTH } = Post;
  if (content.length > MAX_CONTENT_LENGTH) {
    throw ApiError.badRequest(
      `Content must be at most ${MAX_CONTENT_LENGTH} characters.`
    );
  }

  let post;
  try {
    post = await Post.create({ author: authorId, content });
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      throw ApiError.badRequest(err.message);
    }
    throw err;
  }
  return post;
}

async function getPostById(postId, userId) {
  // Returns the post + its interaction summary so the detail view has
  // the same shape as a feed card.
  const post = await Post.findById(postId);
  if (!post) return { post: null, interactionSummary: null };
  if (!userId) {
    return {
      post,
      interactionSummary: { likeCount: 0, likedByMe: false, commentCount: 0 },
    };
  }
  const interactionSummary = await getInteractionSummaryForPost(postId, userId);
  return { post, interactionSummary };
}

/**
 * List posts authored by `authorId`, newest first, paginated.
 * Includes the same interaction summary shape as the feed so the
 * "my posts" view doesn't need its own aggregation.
 */
async function listPostsByAuthor(authorId, { page, limit }, viewerId) {
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Post.find({ author: authorId }).sort(POST_SORT).skip(skip).limit(limit),
    Post.countDocuments({ author: authorId }),
  ]);
  const postIds = docs.map((p) => String(p._id));
  const interactionSummaries = viewerId
    ? await loadInteractionSummaries(postIds, viewerId)
    : new Map();
  return {
    posts: docs,
    pagination: buildPagination({ page, limit, total }),
    interactionSummaries,
  };
}

/**
 * Confirm the target user exists. Distinguishes 404 ("user not found")
 * from 200 + empty list ("user exists but has no posts"). Required by
 * GET /posts/user/:userId so callers don't have to inspect an empty
 * array to guess.
 */
async function assertUserExists(userId) {
  const user = await User.findById(userId).select('_id');
  if (!user) throw ApiError.notFound('User not found');
}

/**
 * Feed eligibility: the caller + every accepted connection.
 *
 * Single query against the connections collection; partner id is the
 * other side of the canonical pair.
 */
async function getFeedAuthorIds(userId) {
  const docs = await Connection.find({
    $or: [{ userA: userId }, { userB: userId }],
    status: STATUS.ACCEPTED,
  }).select('userA userB -_id');

  const ids = new Set([String(userId)]);
  for (const c of docs) {
    const a = String(c.userA);
    const b = String(c.userB);
    if (a === String(userId)) ids.add(b);
    else if (b === String(userId)) ids.add(a);
  }
  return [...ids];
}

/**
 * Batched interaction summary loader. ONE aggregation per type
 * (Reaction counts grouped by postId, Comment counts grouped by
 * postId), plus ONE small per-caller query for "did the caller like
 * each of these posts?". The total query count is constant — 3 round
 * trips — regardless of how many posts are in the page.
 */
async function loadInteractionSummaries(postIds, userId) {
  if (!postIds.length) return new Map();

  const [likes, commentCounts] = await Promise.all([
    reactionService.getSummaryForPosts(postIds, userId),
    commentService.countCommentsForPosts(postIds),
  ]);

  const map = new Map();
  for (const id of postIds) {
    const like = likes[id] || { count: 0, likedByMe: false };
    map.set(id, {
      likeCount: like.count,
      likedByMe: like.likedByMe,
      commentCount: commentCounts[id] || 0,
    });
  }
  return map;
}

/**
 * Feed retrieval: ONE posts query after determining eligible authors.
 *
 * Pending / rejected / withdrawn connections are NEVER included (the
 * Connection model only counts `status: accepted`).
 *
 * Interaction summary (likeCount + likedByMe + commentCount) is
 * computed in batched aggregations — not N+1.
 */
async function getFeedForUser(userId, { page, limit }) {
  const skip = (page - 1) * limit;
  const authorIds = await getFeedAuthorIds(userId);

  const [docs, total] = await Promise.all([
    Post.find({ author: { $in: authorIds }, visibility: 'public' })
      .sort(POST_SORT)
      .skip(skip)
      .limit(limit),
    Post.countDocuments({
      author: { $in: authorIds },
      visibility: 'public',
    }),
  ]);

  const postIds = docs.map((p) => String(p._id));
  const interactionSummaries = await loadInteractionSummaries(postIds, userId);

  return {
    posts: docs,
    pagination: buildPagination({ page, limit, total }),
    interactionSummaries,
  };
}

/**
 * Single-post interaction summary — used by `getPostById` so the
 * detail view has the same summary shape as the feed.
 */
async function getInteractionSummaryForPost(postId, userId) {
  const [likes, commentCounts] = await Promise.all([
    reactionService.getSummaryForPost(postId, userId),
    commentService.countCommentsForPosts([postId]),
  ]);
  return {
    likeCount: likes.count,
    likedByMe: likes.likedByMe,
    commentCount: commentCounts[postId] || 0,
  };
}

/**
 * Atomic ownership-aware update. The author filter prevents IDOR; the
 * findOneAndUpdate returns null when no doc matched, so the caller can
 * distinguish 404 / 403.
 *
 * Returns the updated doc on success; null if either the post doesn't
 * exist or the caller isn't the author. The caller disambiguates.
 */
async function updatePostOwnedBy(postId, callerId, rawBody) {
  const content = normalizeContent(rawBody?.content);
  if (content.length === 0) {
    throw ApiError.badRequest('Content cannot be empty.');
  }
  const { MAX_CONTENT_LENGTH } = Post;
  if (content.length > MAX_CONTENT_LENGTH) {
    throw ApiError.badRequest(
      `Content must be at most ${MAX_CONTENT_LENGTH} characters.`
    );
  }

  return Post.findOneAndUpdate(
    { _id: postId, author: callerId },
    { $set: { content } },
    { new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

/**
 * Atomic ownership-aware delete. Returns the deleted document so the
 * controller can shape a small confirmation response.
 */
async function deletePostOwnedBy(postId, callerId) {
  return Post.findOneAndDelete({ _id: postId, author: callerId });
}

/**
 * Batched lookup of users + their profiles for a list of posts so the
 * serializer can populate the author block. ONE User query + ONE Profile
 * query for the whole batch — no per-post N+1.
 */
async function loadParticipantMap(posts) {
  const userIds = new Set();
  for (const p of posts) {
    if (!p || !p.author) continue;
    userIds.add(String(p.author));
  }
  if (userIds.size === 0) return new Map();

  const ids = [...userIds];
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids } }).select('firstName lastName'),
    Profile.find({ user: { $in: ids } }).select('user headline profilePhoto'),
  ]);

  const userById = new Map(users.map((u) => [String(u._id), u]));
  const profileByUser = new Map(profiles.map((p) => [String(p.user), p]));

  const map = new Map();
  for (const userId of userIds) {
    map.set(userId, {
      user: userById.get(userId) || null,
      profile: profileByUser.get(userId) || null,
    });
  }
  return map;
}

module.exports = {
  createPost,
  getPostById,
  listPostsByAuthor,
  getFeedForUser,
  assertUserExists,
  updatePostOwnedBy,
  deletePostOwnedBy,
  loadParticipantMap,
  getInteractionSummaryForPost,
};
