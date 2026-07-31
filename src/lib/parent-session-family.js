'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');
const { resolveFamilyIdFromHandoff } = require('./parent-session-handoff');

function decodeParentFamilyId(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded?.type === 'parent' && decoded.familyId) {
      return decoded.familyId;
    }
  } catch {
    if (config.jwt.previousSecret) {
      try {
        const decoded = jwt.verify(token, config.jwt.previousSecret);
        if (decoded?.type === 'parent' && decoded.familyId) {
          return decoded.familyId;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Resolve active parent family from request cookies (family-scoped child login fallback).
 */
async function resolveParentFamilyIdFromCookies(req, res) {
  const fromAccess = decodeParentFamilyId(req.cookies?.access_token);
  if (fromAccess) return fromAccess;

  const fromHandoff = await resolveFamilyIdFromHandoff(req, res);
  if (fromHandoff) return fromHandoff;

  return null;
}

module.exports = { resolveParentFamilyIdFromCookies, decodeParentFamilyId };
