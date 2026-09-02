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
        post: toSafePost(
          post,
          participantMap,
          await postService.getInteractionSummaryForPost(post._id, req.user.id)
        ),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/:postId
 *
 * Auth required. Returns 404 when no post matches.
 */
async function getById(req, res, next) {
  try {
    const { post, interactionSummary } = await postService.getPostById(
      req.params.postId,
      req.user.id
    );
    if (!post) throw ApiError.notFound('Post not found');
    const participantMap = await postService.loadParticipantMap([post]);
    res.status(200).json(
      new ApiResponse(200, 'Post retrieved', {
        post: toSafePost(post, participantMap, interactionSummary),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/me
 */
async function getMine(req, res, next) {
  try {
    const { page, limit } = res.locals.pagination.values;
    const result = await postService.listPostsByAuthor(
      req.user.id,
      { page, limit },
      req.user.id
    );
    const participantMap = await postService.loadParticipantMap(result.posts);
    res.status(200).json(
      new ApiResponse(200, 'Your posts retrieved', {
        posts: toSafePostList(
          result.posts,
          participantMap,
          result.interactionSummaries
        ),
        pagination: paginationBlock(result),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/user/:userId
 */
async function getByUser(req, res, next) {
  try {
    await postService.assertUserExists(req.params.userId);
    const { page, limit } = res.locals.pagination.values;
    const result = await postService.listPostsByAuthor(
      req.params.userId,
      { page, limit },
      req.user.id
    );
    const participantMap = await postService.loadParticipantMap(result.posts);
    res.status(200).json(
      new ApiResponse(200, 'User posts retrieved', {
        posts: toSafePostList(
          result.posts,
          participantMap,
          result.interactionSummaries
        ),
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
 * Pagination at the database level. Interaction summary (likeCount +
 * likedByMe + commentCount) is computed in batched aggregations — no N+1.
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
        posts: toSafePostList(
          result.posts,
          participantMap,
          result.interactionSummaries
        ),
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
 * Atomic ownership-aware update. findOneAndUpdate matches only when the
 * caller is the author; we then disambiguate 404 / 403.
 */
async function update(req, res, next) {
  try {
    const updated = await postService.updatePostOwnedBy(
      req.params.postId,
      req.user.id,
      req.body
    );
    if (!updated) {
      const existing = await postService.getPostById(
        req.params.postId,
        req.user.id
      );
      if (!existing.post) throw ApiError.notFound('Post not found');
      throw ApiError.forbidden('You can only edit your own posts.');
    }
    const participantMap = await postService.loadParticipantMap([updated]);
    const interactionSummary = await postService.getInteractionSummaryForPost(
      updated._id,
      req.user.id
    );
    res.status(200).json(
      new ApiResponse(200, 'Post updated', {
        post: toSafePost(updated, participantMap, interactionSummary),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/posts/:postId
 */
async function remove(req, res, next) {
  try {
    const deleted = await postService.deletePostOwnedBy(
      req.params.postId,
      req.user.id
    );
    if (!deleted) {
      const existing = await postService.getPostById(
        req.params.postId,
        req.user.id
      );
      if (!existing.post) throw ApiError.notFound('Post not found');
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
