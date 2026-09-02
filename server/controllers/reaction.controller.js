/**
 * NEXORA — reaction controller.
 *
 * Thin HTTP layer. The service owns idempotency + atomic uniqueness;
 * the controller is responsible for shaping the response.
 *
 * For the first version only the 'like' reaction type exists.
 */

const ApiResponse = require('../utils/ApiResponse');
const reactionService = require('../services/reaction.service');

/**
 * POST /api/v1/posts/:postId/reactions
 *
 * Body may be empty. The user is always req.user.id. Idempotent: a
 * duplicate like is silently treated as a no-op success.
 */
async function like(req, res, next) {
  try {
    const { reaction, created } = await reactionService.likePost(
      req.params.postId,
      req.user.id
    );
    res.status(created ? 201 : 200).json(
      new ApiResponse(
        created ? 201 : 200,
        created ? 'Post liked' : 'Post already liked',
        {
          reaction: { id: String(reaction._id) },
          likedByMe: true,
        }
      )
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/posts/:postId/reactions
 *
 * Idempotent: returns 200 either way. `removed: true` when a
 * reaction was actually deleted; `removed: false` when nothing matched.
 */
async function unlike(req, res, next) {
  try {
    const { removed } = await reactionService.unlikePost(
      req.params.postId,
      req.user.id
    );
    res.status(200).json(
      new ApiResponse(200, removed ? 'Post unliked' : 'No reaction to remove', {
        removed,
        likedByMe: false,
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/posts/:postId/reactions
 *
 * Returns a small summary — count + likedByMe — for the calling user.
 */
async function summary(req, res, next) {
  try {
    const summary = await reactionService.getSummaryForPost(
      req.params.postId,
      req.user.id
    );
    res
      .status(200)
      .json(new ApiResponse(200, 'Reaction summary retrieved', summary));
  } catch (err) {
    next(err);
  }
}

module.exports = { like, unlike, summary };
