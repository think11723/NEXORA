const { Router } = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const profileRoutes = require('./profile.routes');
const connectionRoutes = require('./connection.routes');
const postRoutes = require('./post.routes');

/**
 * Single entry point that mounts every route module under /api/v1.
 * Adding a new feature = add a router here, nothing else.
 */
const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/connections', connectionRoutes);
router.use('/posts', postRoutes);

module.exports = router;
