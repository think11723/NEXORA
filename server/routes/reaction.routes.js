/**
 * NEXORA — reaction routes.
 *
 * Mounted at /api/v1/posts/:postId/reactions and /api/v1/posts/:postId
 * uses the path-param validator pattern fixed in Phase 4 Prompt 2.
 */

const { Router } = require('express');

const reactionController = require('../controllers/reaction.controller');
const { requireAuth } = require('../middleware/auth');
const { validateParams } = require('../middleware/validate');
const { validatePostIdParam } = require('../validators/interaction.validator');

const router = Router({ mergeParams: true });

router.use(requireAuth);

// All reaction endpoints operate on a specific post id.
router.post('/', validateParams(validatePostIdParam), reactionController.like);

router.delete(
  '/',
  validateParams(validatePostIdParam),
  reactionController.unlike
);

router.get(
  '/',
  validateParams(validatePostIdParam),
  reactionController.summary
);

module.exports = router;
