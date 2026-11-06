/**
 * Validates req.body against a zod schema. Replaces req.body with the parsed
 * (trimmed/coerced) value and returns a 400 with the first problem otherwise.
 */
const validate = (schema) => async (req, res, next) => {
  const result = await schema.safeParseAsync(req.body || {});
  if (result.success) {
    req.body = result.data;
    return next();
  }
  const issues = result.error.issues || [];
  const first = issues[0];
  const message = first ? first.message : 'Validation failed';
  return res.status(400).json({
    success: false,
    message,
    error: { code: 'VALIDATION_ERROR', message },
    errors: issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
    requestId: req.id
  });
};

module.exports = validate;
