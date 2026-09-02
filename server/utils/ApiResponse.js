/**
 * Consistent success-response envelope.
 *
 * Use this from controllers/services so every successful response
 * shares the same shape: { success, message, data, meta }.
 */
class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.success = statusCode >= 200 && statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }
}

module.exports = ApiResponse;
