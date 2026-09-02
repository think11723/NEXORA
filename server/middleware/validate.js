/**
 * NEXORA — generic validation middleware factories.
 *
 * `validate(validatorFn)` runs against `req.body`.
 * `validateParams(validatorFn)` runs against `req.params` (one or more
 * path parameters).
 * `paginationMiddleware` parses `?page=&limit=` and stores the
 *   normalized values on `res.locals.pagination`.
 *
 * If any errors are present, forwards an ApiError.badRequest carrying the
 * field-level details under `errors`.
 */

const ApiError = require('../utils/ApiError');
const { validatePaginationQuery } = require('../validators/post.validator');

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

function paginationMiddleware(req, res, next) {
  const result = validatePaginationQuery(req.query);
  if (Object.keys(result.errors).length > 0) {
    return next(
      ApiError.badRequest(result.errors[Object.keys(result.errors)[0]])
    );
  }
  res.locals.pagination = result;
  return next();
}

module.exports = { validate, validateParams, paginationMiddleware };
