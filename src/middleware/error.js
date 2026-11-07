const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const notFound = (req, _res, next) => next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Internal server error';
  let extra = err.extra || {};

  if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  else if (err.name === 'CastError') { status = 400; message = `Invalid ${err.path}`; }
  else if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Validation failed';
    extra = { errors: Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })) };
  } else if (err.code === 11000) { status = 409; message = 'Duplicate value'; }
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') { status = 401; message = 'Invalid or expired token'; }

  if (status >= 500) {
    if (!env.isTest) console.error(err);
    if (env.isProd) message = 'Internal server error';
  }
  res.status(status).json({ success: false, message, ...extra });
};

module.exports = { notFound, errorHandler };
