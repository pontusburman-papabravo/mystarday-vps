/**
 * Validation middleware.
 * Owns: Zod-based input validation for req.body, req.params, req.query.
 * Does NOT own: auth, rate limiting, CSRF protection.
 *
 * Kill switch: VALIDATION_ENABLED=false disables all validation.
 * Rollback: set env var, redeploy — no code change needed.
 */

const { sendApiError } = require('../lib/api-user-error');

const VALIDATION_ENABLED = process.env.VALIDATION_ENABLED !== 'false';

/**
 * Strip HTML tags and script patterns from a string.
 * Belt-and-suspenders — parameterized queries handle SQL injection,
 * but we sanitize anyway to prevent stored XSS.
 */
function stripHtml(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<[^>]*>/g, '')              // strip HTML tags
    .replace(/javascript:/gi, '')         // strip JS protocol
    .replace(/on\w+\s*=/gi, '')           // strip event handlers
    .replace(/<!--[\s\S]*?-->/g, '')      // strip HTML comments
    .trim();
}

/**
 * Recursively sanitize all string fields in an object.
 * Applied to req.body before schema validation.
 */
function sanitizeStrings(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeStrings);
  const out = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string') {
      out[key] = stripHtml(val);
    } else if (typeof val === 'object' && val !== null) {
      out[key] = sanitizeStrings(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

/**
 * Format Zod validation errors into human-readable messages.
 * Never exposes internal structure or stack traces.
 */
function formatZodErrors(error) {
  return error.errors.map(e => {
    const field = e.path.length > 0 ? e.path.join('.') : 'value';
    return `${field}: ${e.message}`;
  });
}

/**
 * Log validation failure for security monitoring.
 * Captures field names (not values) + path for attack pattern detection.
 */
function logValidationFailure(req, errors) {
  const fields = errors.map(e => e.path.join('.') || 'root');
  console.warn('[VALIDATION] Failure', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    fields,
    userId: req.user?.id || null,
  });
}

/**
 * Middleware factory: validates req.body against a Zod schema.
 * Sanitizes HTML from all string fields before validation.
 *
 * Usage: router.post('/path', validate(MySchema), handler)
 */
function validate(schema) {
  return (req, res, next) => {
    if (!VALIDATION_ENABLED) return next();

    // Sanitize strings before validation
    req.body = sanitizeStrings(req.body);

    const result = schema.safeParse(req.body);
    if (!result.success) {
      logValidationFailure(req, result.error.errors);
      return sendApiError(res, 400, 'VALIDATION_INVALID_VALUES', {
        details: formatZodErrors(result.error),
      });
    }

    // Replace req.body with the parsed (coerced + stripped) data
    req.body = result.data;
    next();
  };
}

/**
 * Middleware factory: validates req.params against a Zod schema.
 *
 * Usage: router.get('/:id', validateParams(ParamSchema), handler)
 */
function validateParams(schema) {
  return (req, res, next) => {
    if (!VALIDATION_ENABLED) return next();

    const result = schema.safeParse(req.params);
    if (!result.success) {
      logValidationFailure(req, result.error.errors);
      return sendApiError(res, 400, 'VALIDATION_INVALID_PARAMS', {
        details: formatZodErrors(result.error),
      });
    }
    req.params = result.data;
    next();
  };
}

/**
 * Middleware factory: validates req.query against a Zod schema.
 *
 * Usage: router.get('/', validateQuery(QuerySchema), handler)
 */
function validateQuery(schema) {
  return (req, res, next) => {
    if (!VALIDATION_ENABLED) return next();

    const result = schema.safeParse(req.query);
    if (!result.success) {
      logValidationFailure(req, result.error.errors);
      return sendApiError(res, 400, 'VALIDATION_INVALID_QUERY', {
        details: formatZodErrors(result.error),
      });
    }
    req.query = result.data;
    next();
  };
}

module.exports = { validate, validateParams, validateQuery, sanitizeStrings, stripHtml };
