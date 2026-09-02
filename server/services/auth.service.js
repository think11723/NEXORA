/**
 * NEXORA — auth service.
 *
 * Reusable business logic for registration, login, and identity lookup.
 * Controllers stay focused on HTTP concerns; persistence and policy live
 * here.
 */

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

const ALLOWED_REGISTRATION_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'password',
];

function pickRegistrationInput(body) {
  const source = body && typeof body === 'object' ? body : {};
  const picked = {};
  for (const key of ALLOWED_REGISTRATION_FIELDS) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

/**
 * Register a new user.
 *
 * - Trims and normalizes email.
 * - Whitelists allowed input fields (mass-assignment protection).
 * - Hashes the password via the User pre-save hook.
 * - Surfaces duplicate emails as ApiError(409).
 */
async function registerUser(rawBody) {
  const input = pickRegistrationInput(rawBody);
  input.email = normalizeEmail(input.email);
  if (typeof input.firstName === 'string')
    input.firstName = input.firstName.trim();
  if (typeof input.lastName === 'string')
    input.lastName = input.lastName.trim();

  let user;
  try {
    user = await User.create(input);
  } catch (err) {
    if (err && err.code === 11000) {
      throw ApiError.conflict('An account with this email already exists');
    }
    throw err;
  }

  // Re-fetch with default projection so toJSON strips the hash defensively.
  // (Hash is already excluded by select:false, but the belt-and-braces read
  // ensures we never accidentally serialize it via a populated path.)
  const safe = await User.findById(user._id);
  const token = signToken(safe._id.toString());
  return { user: safe, token };
}

/**
 * Authenticate an existing user.
 *
 * - Always returns the same generic failure for unknown-email / wrong-password.
 * - Treats inactive accounts as failures.
 * - Never returns the password hash.
 */
async function loginUser(rawBody) {
  const source = rawBody && typeof rawBody === 'object' ? rawBody : {};
  const email = normalizeEmail(source.email);
  const password = source.password;

  // Always run the comparison against a known hash (or absent hash) so the
  // login response time doesn't leak whether the email exists. We compare
  // against a dummy bcrypt hash when the user is missing.
  const DUMMY_HASH =
    '$2a$10$CwTycUXWue0Thq9StjUM0uJ8hZ4u1Rq1n6Y1vE1m4u0l9h4u3n6eO';

  const user = await User.findOne({ email }).select('+password');
  const hash = user ? user.password : DUMMY_HASH;
  // bcrypt.compare on the dummy when the user is missing keeps response
  // time roughly constant. The result is ignored in that branch.
  const ok = await bcryptCompare(password, hash);

  if (!user || !ok) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.isActive === false) {
    throw ApiError.forbidden('Account is disabled');
  }

  const token = signToken(user._id.toString());
  return { user, token };
}

/**
 * Fetch a user by id (without password hash) for the /me endpoint and
 * any future internal callers.
 */
async function getUserById(id) {
  return User.findById(id);
}

// Local helper to keep bcrypt import out of the module's public surface.
const bcrypt = require('bcryptjs');
function bcryptCompare(candidate, hash) {
  return bcrypt.compare(candidate || '', hash);
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
};
