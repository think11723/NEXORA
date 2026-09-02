const { Router } = require('express');

const profileController = require('../controllers/profile.controller');
const { requireAuth } = require('../middleware/auth');
const { validate, validateParams } = require('../middleware/validate');
const {
  validateProfileUpdatePayload,
  validateUserIdParam,
} = require('../validators/profile.validator');

const router = Router();

// Authenticated — read/update the caller's own profile.
router.get('/me', requireAuth, profileController.getMyProfile);
router.patch(
  '/me',
  requireAuth,
  validate(validateProfileUpdatePayload),
  profileController.updateMyProfile
);

// Public — read another user's profile. No auth required; the path
// parameter is validated before the controller runs.
router.get(
  '/:userId',
  validateParams(validateUserIdParam),
  profileController.getProfileByUserId
);

module.exports = router;
