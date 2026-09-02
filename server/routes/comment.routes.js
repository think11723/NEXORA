/**
 * NEXORA — comment routes.
 *
 * Two mount points:
 *   /api/v1/posts/:postId/comments     — list + create (post-scoped)
 *   /api/v1/comments/:commentId         — edit + delete (comment-scoped)
 *
 * The post-scoped routes use the post id validator; the comment-scoped
 * routes use the comment id validator.
 */

const { Router } = require('express');

const commentController = require('../controllers/comment.controller');
const { requireAuth } = require('../middleware/auth');
const {
  validate,
  validateParams,
  paginationMiddleware,
} = require('../middleware/validate');
const {
  validatePostIdParam,
  validateCommentIdParam,
  validateCommentCreatePayload,
  validateCommentUpdatePayload,
} = require('../validators/interaction.validator');

const postCommentsRouter = Router({ mergeParams: true });
postCommentsRouter.use(requireAuth);

postCommentsRouter.get(
  '/',
  validateParams(validatePostIdParam),
  paginationMiddleware,
  commentController.list
);

postCommentsRouter.post(
  '/',
  validateParams(validatePostIdParam),
  validate(validateCommentCreatePayload),
  commentController.create
);

const commentItemRouter = Router();
commentItemRouter.use(requireAuth);

commentItemRouter.patch(
  '/:commentId',
  validateParams(validateCommentIdParam),
  validate(validateCommentUpdatePayload),
  commentController.update
);

commentItemRouter.delete(
  '/:commentId',
  validateParams(validateCommentIdParam),
  commentController.remove
);

module.exports = {
  postCommentsRouter,
  commentItemRouter,
};
