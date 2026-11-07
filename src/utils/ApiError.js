class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra; // e.g. { errors: [...] } or { serverVersion: {...} }
  }
  static badRequest(msg, extra) { return new ApiError(400, msg, extra); }
  static unauthorized(msg = 'Authentication required') { return new ApiError(401, msg); }
  static notFound(msg = 'Resource not found') { return new ApiError(404, msg); }
  static conflict(msg, extra) { return new ApiError(409, msg, extra); }
}
module.exports = ApiError;
