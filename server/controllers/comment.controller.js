/**
 * NEXORA — comment controller.
 *
 * Thin HTTP layer. The service owns pagination + ownership; the
 * controller shapes the response envelope.
 *
 * Comments are returned in chronological (oldest first) order with a
 * pagination block, mirroring the existing Post list pattern.
 */

const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const commentService = require('../services/comment.service');
const { toSafeComment, toSafeCommentList } = require('../utils/safeComment');

/**
 * POST /api/v1/posts/:postId/comments
 */
async function create(req, res, next) {
  try {
    const comment = await commentService.createComment(
      req.params.postId,
      req.user.id,
      req.body
    );
    const participantMap = await commentService.loadCommentParticipantMap([
      comment,
    ]);
    res.status(201).json(
      new ApiResponse(201, 'Comment created', {
        comment: toSafeComment(comment, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/:postId/comments
 */
async function list(req, res, next) {
  try {
    const { page, limit } = res.locals.pagination.values;
    const result = await commentService.listCommentsForPost(req.params.postId, {
      page,
      limit,
    });
    const participantMap = await commentService.loadCommentParticipantMap(
      result.comments
    );
    res.status(200).json(
      new ApiResponse(200, 'Comments retrieved', {
        comments: toSafeCommentList(result.comments, participantMap),
        pagination: result.pagination,
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/comments/:commentId
 *
 * Atomic ownership-aware update. The findOneAndUpdate matches only
 * when the caller is the author; we then disambiguate 404 / 403.
 */
async function update(req, res, next) {
  try {
    const updated = await commentService.updateCommentOwnedBy(
      req.params.commentId,
      req.user.id,
      req.body
    );
    if (!updated) {
      throw ApiError.forbidden('You can only edit your own comments.');
    }
    const participantMap = await commentService.loadCommentParticipantMap([
      updated,
    ]);
    res.status(200).json(
      new ApiResponse(200, 'Comment updated', {
        comment: toSafeComment(updated, participantMap),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/comments/:commentId
 *
 * Atomic ownership-aware delete. 404 for missing / 403 for not the
 * author — both surface as a 403 (project convention) when ownership
 * is the issue and the document exists.
 */
async function remove(req, res, next) {
  try {
    const deleted = await commentService.deleteCommentOwnedBy(
      req.params.commentId,
      req.user.id
    );
    if (!deleted) {
      throw ApiError.forbidden('You can only delete your own comments.');
    }
    res.status(200).json(
      new ApiResponse(200, 'Comment removed', {
        removed: true,
        id: String(deleted._id),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, update, remove };
