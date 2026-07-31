'use strict';

/**
 * Child-login body validation with stable error codes for the child UI.
 * Does not change the generic validate() middleware used by other routes.
 */

const { ChildLoginSchema } = require('../lib/schemas');
const { sanitizeStrings } = require('./validate');

const VALIDATION_ENABLED = process.env.VALIDATION_ENABLED !== 'false';

/**
 * Map Zod issues on ChildLoginSchema to stable child-facing codes.
 * @param {import('zod').ZodError} error
 * @returns {string}
 */
function childLoginCodeFromZodError(error) {
  const issues = error.errors || [];
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const field = issue.path && issue.path[0];
    if (field === 'username') {
      if (issue.code === 'too_big') return 'CHILD_NAME_INVALID';
      if (issue.code === 'invalid_type' || issue.code === 'too_small') return 'CHILD_NAME_REQUIRED';
      return 'CHILD_NAME_INVALID';
    }
    if (field === 'pin') {
      if (issue.code === 'invalid_type') return 'CHILD_PIN_REQUIRED';
      return 'CHILD_PIN_INVALID_FORMAT';
    }
  }
  return 'CHILD_SERVER_ERROR';
}

function logChildLoginValidationFailure(req, error) {
  const fields = (error.errors || []).map((e) => (e.path && e.path.join('.')) || 'root');
  console.warn('[VALIDATION] child-login failure', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    fields,
    userId: req.user?.id || null,
  });
}

function validateChildLoginBody(req, res, next) {
  if (!VALIDATION_ENABLED) return next();

  req.body = sanitizeStrings(req.body);

  const result = ChildLoginSchema.safeParse(req.body);
  if (!result.success) {
    logChildLoginValidationFailure(req, result.error);
    const code = childLoginCodeFromZodError(result.error);
    return res.status(400).json({ code });
  }

  req.body = result.data;
  next();
}

module.exports = { validateChildLoginBody, childLoginCodeFromZodError };
