/**
 * NEXORA — auth validators.
 *
 * Lightweight, dependency-free validators for the authentication routes.
 * Each function returns a plain object of errors (empty when valid).
 * The `validate` middleware assembles them into the standard envelope.
 *
 * Why custom? The rules are well-bounded and we want to avoid a third
 * dependency for the first real feature. If the rule set grows, swap this
 * for `express-validator` or `zod` without touching the controllers.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 60;

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateName(field, value) {
  if (!isNonEmptyString(value)) {
    return `${field} is required`;
  }
  if (value.length > MAX_NAME_LENGTH) {
    return `${field} must be at most ${MAX_NAME_LENGTH} characters`;
  }
  return null;
}

function validateEmail(value) {
  if (!isNonEmptyString(value)) {
    return 'Email is required';
  }
  if (!EMAIL_PATTERN.test(value.trim())) {
    return 'Email format is invalid';
  }
  return null;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Password is required';
  }
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters`;
  }
  return null;
}

function validateRegisterPayload(body) {
  const errors = {};
  const source = body && typeof body === 'object' ? body : {};

  const firstNameError = validateName('firstName', source.firstName);
  if (firstNameError) errors.firstName = firstNameError;

  const lastNameError = validateName('lastName', source.lastName);
  if (lastNameError) errors.lastName = lastNameError;

  const emailError = validateEmail(source.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(source.password);
  if (passwordError) errors.password = passwordError;

  return errors;
}

function validateLoginPayload(body) {
  const errors = {};
  const source = body && typeof body === 'object' ? body : {};

  const emailError = validateEmail(source.email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(source.password);
  if (passwordError) errors.password = passwordError;

  return errors;
}

module.exports = {
  validateRegisterPayload,
  validateLoginPayload,
};
