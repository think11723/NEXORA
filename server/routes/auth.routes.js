const { Router } = require('express');

const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  validateRegisterPayload,
  validateLoginPayload,
} = require('../validators/auth.validator');

const router = Router();

router.post(
  '/register',
  validate(validateRegisterPayload),
  authController.register
);
router.post('/login', validate(validateLoginPayload), authController.login);
router.get('/me', requireAuth, authController.me);

module.exports = router;
