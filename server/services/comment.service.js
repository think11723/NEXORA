/**
 * NEXORA — comment service.
 *
 * Lifecycle:
 *   - createComment(postId, authorId, rawBody) — validates + persists
 *   - listCommentsForPost(postId, { page, limit })
 *       → { comments, pagination } sorted ASC by createdAt (oldest
 *         first — natural conversation flow)
 *   - updateCommentOwnedBy(commentId, callerId, rawBody)
 *   - deleteCommentOwnedBy(commentId, callerId)
 *
 * Ownership: edit / delete are atomic ownership-aware. The author
 * filter prevents IDOR; non-author requests get 403.
 */

const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const Profile = require('../models/Profile');
const ApiError = require('../utils/ApiError');

const COMMENT_SORT = { createdAt: 1, _id: 1 };

function normalizeContent(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

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

async function assertPostExists(postId) {
  const exists = await Post.exists({ _id: postId });
  if (!exists) throw ApiError.notFound('Post not found');
}

async function createComment(postId, authorId, rawBody) {
  await assertPostExists(postId);
  const content = normalizeContent(rawBody?.content);
  if (content.length === 0) {
    throw ApiError.badRequest('Content cannot be empty.');
  }
  const { MAX_CONTENT_LENGTH } = Comment;
  if (content.length > MAX_CONTENT_LENGTH) {
    throw ApiError.badRequest(
      `Content must be at most ${MAX_CONTENT_LENGTH} characters.`
    );
  }
  let comment;
  try {
    comment = await Comment.create({ post: postId, author: authorId, content });
  } catch (err) {
    if (err && err.name === 'ValidationError') {
      throw ApiError.badRequest(err.message);
    }
    throw err;
  }
  return comment;
}

async function listCommentsForPost(postId, { page, limit }) {
  await assertPostExists(postId);
  const skip = (page - 1) * limit;
  const [docs, total] = await Promise.all([
    Comment.find({ post: postId }).sort(COMMENT_SORT).skip(skip).limit(limit),
    Comment.countDocuments({ post: postId }),
  ]);
  return {
    comments: docs,
    pagination: buildPagination({ page, limit, total }),
  };
}

async function updateCommentOwnedBy(commentId, callerId, rawBody) {
  const content = normalizeContent(rawBody?.content);
  if (content.length === 0) {
    throw ApiError.badRequest('Content cannot be empty.');
  }
  const { MAX_CONTENT_LENGTH } = Comment;
  if (content.length > MAX_CONTENT_LENGTH) {
    throw ApiError.badRequest(
      `Content must be at most ${MAX_CONTENT_LENGTH} characters.`
    );
  }
  return Comment.findOneAndUpdate(
    { _id: commentId, author: callerId },
    { $set: { content } },
    { new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}

async function deleteCommentOwnedBy(commentId, callerId) {
  return Comment.findOneAndDelete({ _id: commentId, author: callerId });
}

/**
 * Batched lookup of users + profiles for a list of comments. ONE User
 * query + ONE Profile query for the entire batch — no per-comment N+1.
 */
async function loadCommentParticipantMap(comments) {
  const userIds = new Set();
  for (const c of comments) {
    if (!c || !c.author) continue;
    userIds.add(String(c.author));
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

/**
 * Count comments per postId for a batch — used by the Feed interaction
 * summary to compute commentCount without N+1.
 */
async function countCommentsForPosts(postIds) {
  const ids = [...new Set(postIds.filter(Boolean))].map(String);
  const map = Object.fromEntries(ids.map((id) => [id, 0]));
  if (ids.length === 0) return map;

  const counts = await Comment.aggregate([
    { $match: { post: { $in: ids } } },
    { $group: { _id: '$post', count: { $sum: 1 } } },
  ]);
  for (const c of counts) {
    map[String(c._id)] = c.count;
  }
  return map;
}

module.exports = {
  createComment,
  listCommentsForPost,
  updateCommentOwnedBy,
  deleteCommentOwnedBy,
  loadCommentParticipantMap,
  countCommentsForPosts,
};
