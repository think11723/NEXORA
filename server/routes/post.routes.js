/**
 * NEXORA — post routes.
 *
 * All routes mounted under `/api/v1/posts`. Authentication is required
 * on every route; the brief's policy decision is that single-post
 * retrieval also requires auth (consistent with /profile and /connections).
 *
 * Path-parameter validators follow the (req) signature fixed in Phase 4
 * Prompt 2. Pagination is validated via a small inline middleware that
 * normalizes `?page=&limit=` and attaches the result to `res.locals.pagination`.
 *
 * Route order matters — literal segments (`/feed`, `/me`) are declared
 * BEFORE parameterized segments (`/:postId`, `/user/:userId`) so React
 * Router / Express both match them first.
 */

const { Router } = require('express');

const postController = require('../controllers/post.controller');
const { requireAuth } = require('../middleware/auth');
const { validate, validateParams } = require('../middleware/validate');
const {
  validatePostCreatePayload,
  validatePostUpdatePayload,
  validatePostIdParam,
  validateUserIdParam,
  validatePaginationQuery,
} = require('../validators/post.validator');

const router = Router();

// All post routes require an authenticated caller.
router.use(requireAuth);

/**
 * Pagination middleware: validates `?page=&limit=` and attaches the
 * normalized values to res.locals.pagination. Bad values fall back to
 * defaults rather than rejecting the request, so a typo in the URL
 * doesn't break the page.
 */
function paginationMiddleware(req, res, next) {
  const result = validatePaginationQuery(req.query);
  if (Object.keys(result.errors).length > 0) {
    // Reject the request with the first error. This matches the
    // project's existing convention of returning 400 for bad pagination.
    const first = Object.values(result.errors)[0];
    return next(ApiError.badRequest(first));
  }
  res.locals.pagination = result;
  return next();
}

// Tiny inline import to avoid a circular module reference.
const ApiError = require('../utils/ApiError');

// Literal segments first so they win over parameterized matches.
router.get('/feed', paginationMiddleware, postController.getFeed);
router.get('/me', paginationMiddleware, postController.getMine);
router.get(
  '/user/:userId',
  paginationMiddleware,
  validateParams(validateUserIdParam),
  postController.getByUser
);

router.post('/', validate(validatePostCreatePayload), postController.create);

// Parameterized segments after.
router.get(
  '/:postId',
  validateParams(validatePostIdParam),
  postController.getById
);
router.patch(
  '/:postId',
  validateParams(validatePostIdParam),
  validate(validatePostUpdatePayload),
  postController.update
);
router.delete(
  '/:postId',
  validateParams(validatePostIdParam),
  postController.remove
);

module.exports = router;
