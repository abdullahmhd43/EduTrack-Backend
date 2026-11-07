const ApiError = require('../utils/ApiError');

/** Parse req.body with a zod schema; replace body with the parsed (trimmed/defaulted) value. */
function parseBody(schema, body) {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
    throw ApiError.badRequest('Validation failed', { errors });
  }
  return result.data;
}

const validate = (schema) => (req, _res, next) => {
  try {
    req.body = parseBody(schema, req.body);
    next();
  } catch (e) {
    next(e);
  }
};

module.exports = { validate, parseBody };
