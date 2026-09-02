/**
 * NEXORA — auth controller.
 *
 * Thin HTTP layer: parse the request, call the service, shape the response.
 * No business logic, no password handling, no JWT construction here.
 */

const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { toSafeUser } = require('../utils/safeUser');
const authService = require('../services/auth.service');

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.status(201).json(
      new ApiResponse(201, 'Account created successfully', {
        token,
        user: toSafeUser(user),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.status(200).json(
      new ApiResponse(200, 'Login successful', {
        token,
        user: toSafeUser(user),
      })
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 *
 * Requires the auth middleware to populate req.user.
 */
async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);
    if (!user) {
      return next(ApiError.notFound('User not found'));
    }
    res.status(200).json(
      new ApiResponse(200, 'Current user retrieved', {
        user: toSafeUser(user),
      })
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };
