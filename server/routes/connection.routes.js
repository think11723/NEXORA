const { Router } = require('express');

const connectionController = require('../controllers/connection.controller');
const { requireAuth } = require('../middleware/auth');
const { validateParams } = require('../middleware/validate');
const {
  validateUserIdParam,
  validateConnectionIdParam,
} = require('../validators/connection.validator');

const router = Router();

// All connection routes require an authenticated caller. The acting
// user is always req.user.id — never derived from a request body.
router.use(requireAuth);

// Status lookups (target-user-scoped, more specific path segments first).
router.get(
  '/status/:userId',
  validateParams(validateUserIdParam),
  connectionController.getStatus
);

// Incoming / outgoing listings.
router.get('/incoming', connectionController.listIncoming);
router.get('/outgoing', connectionController.listOutgoing);

// Accepted connections list.
router.get('/', connectionController.listAccepted);

// Actions on a specific connection document. The :connectionId segment
// is more specific than the :userId segment above, but ordering matters
// in Express — these are declared below the /status/... routes so the
// literal segments there win first.
router.post(
  '/:userId/request',
  validateParams(validateUserIdParam),
  connectionController.sendRequest
);

router.post(
  '/:connectionId/accept',
  validateParams(validateConnectionIdParam),
  connectionController.accept
);

router.post(
  '/:connectionId/reject',
  validateParams(validateConnectionIdParam),
  connectionController.reject
);

router.post(
  '/:connectionId/withdraw',
  validateParams(validateConnectionIdParam),
  connectionController.withdraw
);

router.delete(
  '/:connectionId',
  validateParams(validateConnectionIdParam),
  connectionController.remove
);

module.exports = router;
