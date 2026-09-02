/**
 * NEXORA — generic validation middleware factories.
 *
 * `validate(validatorFn)` runs against `req.body`.
 * `validateParams(validatorFn)` runs against `req.params` (one or more
 * path parameters).
 *
 * If any errors are present, forwards an ApiError.badRequest carrying the
 * field-level details under `errors`.
 */

const ApiError = require('../utils/ApiError');

function validate(validatorFn) {
  return function validationMiddleware(req, _res, next) {
    const errors = validatorFn(req.body);
    if (errors && Object.keys(errors).length > 0) {
      return next(ApiError.badRequest('Validation failed', errors));
    }
    return next();
  };
}

function validateParams(validatorFn) {
  return function paramValidationMiddleware(req, _res, next) {
    const errors = validatorFn(req.params);
    if (errors && Object.keys(errors).length > 0) {
      return next(ApiError.badRequest('Invalid path parameter', errors));
    }
    return next();
  };
}

module.exports = { validate, validateParams };
