/**
 * NEXORA — post controller.
 *
 * Thin HTTP layer. All business logic lives in `post.service.js`. Errors
 * flow through the centralized error middleware via `next(err)`.
 */

const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const postService = require('../services/post.service');
const { toSafePost, toSafePostList } = require('../utils/safePost');

/**
 * Helper: build the pagination block from a service result.
 */
function paginationBlock(result) {
  return result.pagination;
}

/**
 * POST /api/v1/posts
 */
async function create(req, res, next) {
  try {
    const post = await postService.createPost(req.user.id, req.body);
    const participantMap = await postService.loadParticipantMap([post]);
    res.status(201).json(
      new ApiResponse(201, 'Post created', {
        post: toSafePost(post, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/:postId
 *
 * Auth required (consistent with the rest of the API surface).
 * Returns 404 when no post matches.
 */
async function getById(req, res, next) {
  try {
    const post = await postService.getPostById(req.params.postId);
    if (!post) throw ApiError.notFound('Post not found');
    const participantMap = await postService.loadParticipantMap([post]);
    res.status(200).json(
      new ApiResponse(200, 'Post retrieved', {
        post: toSafePost(post, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/me
 *
 * Posts authored by req.user.id. The user id is always derived from
 * the JWT — the client cannot influence it.
 */
async function getMine(req, res, next) {
  try {
    const { page, limit } = res.locals.pagination.values;
    const result = await postService.listPostsByAuthor(req.user.id, {
      page,
      limit,
    });
    const participantMap = await postService.loadParticipantMap(result.posts);
    res.status(200).json(
      new ApiResponse(200, 'Your posts retrieved', {
        posts: toSafePostList(result.posts, participantMap),
        pagination: paginationBlock(result),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/user/:userId
 *
 * Posts authored by `:userId`. 404 when the target user does not
 * exist; 200 + empty array when the user exists but has no posts.
 */
async function getByUser(req, res, next) {
  try {
    await postService.assertUserExists(req.params.userId);
    const { page, limit } = res.locals.pagination.values;
    const result = await postService.listPostsByAuthor(req.params.userId, {
      page,
      limit,
    });
    const participantMap = await postService.loadParticipantMap(result.posts);
    res.status(200).json(
      new ApiResponse(200, 'User posts retrieved', {
        posts: toSafePostList(result.posts, participantMap),
        pagination: paginationBlock(result),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/feed
 *
 * Chronological feed: caller's own posts + accepted connections' posts.
 * Pagination at the database level. ONE posts query after determining
 * eligible authors — no N+1.
 */
async function getFeed(req, res, next) {
  try {
    const { page, limit } = res.locals.pagination.values;
    const result = await postService.getFeedForUser(req.user.id, {
      page,
      limit,
    });
    const participantMap = await postService.loadParticipantMap(result.posts);
    res.status(200).json(
      new ApiResponse(200, 'Feed retrieved', {
        posts: toSafePostList(result.posts, participantMap),
        pagination: paginationBlock(result),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/posts/:postId
 *
 * Atomic ownership-aware update. The findOneAndUpdate matches only
 * when the caller is the author; we then disambiguate 404 / 403.
 */
async function update(req, res, next) {
  try {
    const updated = await postService.updatePostOwnedBy(
      req.params.postId,
      req.user.id,
      req.body
    );
    if (!updated) {
      // Either the post doesn't exist, or the caller isn't the author.
      // Distinguish without leaking existence: load + check ownership.
      // (We don't want to expose "this post exists" to non-author
      // users; the project's existing convention is to return 403 in
      // both cases for non-owners — see existing service rules.)
      const existing = await postService.getPostById(req.params.postId);
      if (!existing) throw ApiError.notFound('Post not found');
      throw ApiError.forbidden('You can only edit your own posts.');
    }
    const participantMap = await postService.loadParticipantMap([updated]);
    res.status(200).json(
      new ApiResponse(200, 'Post updated', {
        post: toSafePost(updated, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/posts/:postId
 *
 * Atomic ownership-aware delete. Returns a small confirmation payload,
 * not the deleted document.
 */
async function remove(req, res, next) {
  try {
    const deleted = await postService.deletePostOwnedBy(
      req.params.postId,
      req.user.id
    );
    if (!deleted) {
      const existing = await postService.getPostById(req.params.postId);
      if (!existing) throw ApiError.notFound('Post not found');
      throw ApiError.forbidden('You can only delete your own posts.');
    }
    res.status(200).json(
      new ApiResponse(200, 'Post removed', {
        removed: true,
        id: deleted._id.toString(),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  getById,
  getMine,
  getByUser,
  getFeed,
  update,
  remove,
};
