'use strict';

const db = require('../src/lib/db');

async function getActiveRegistry(locale = 'sv') {
  const result = await db.query(
    `SELECT version, phase, experience_key, tone, headline, body, cta
     FROM journey_experience_registry
     WHERE is_active = true AND locale = $1
     ORDER BY version DESC, phase, experience_key`,
    [locale]
  );
  if (!result.rows.length) return null;

  const version = result.rows[0].version;
  const phases = {};
  for (const row of result.rows) {
    if (row.version !== version) continue;
    if (!phases[row.phase]) phases[row.phase] = {};
    phases[row.phase][row.experience_key] = {
      tone: row.tone,
      headline: row.headline,
      body: row.body,
      cta: row.cta,
    };
  }
  return { version, phases };
}

async function getExperience(version, phase, experienceKey, locale = 'sv') {
  const result = await db.query(
    `SELECT tone, headline, body, cta FROM journey_experience_registry
     WHERE version = $1 AND phase = $2 AND experience_key = $3 AND locale = $4 AND is_active = true
     LIMIT 1`,
    [version, phase, experienceKey, locale]
  );
  return result.rows[0] || null;
}

async function listActiveRows(locale = 'sv') {
  const result = await db.query(
    `SELECT version, phase, experience_key, tone, headline, body, cta, locale, is_active
     FROM journey_experience_registry
     WHERE is_active = true AND locale = $1
     ORDER BY version DESC, phase, experience_key`,
    [locale]
  );
  return result.rows;
}

module.exports = { getActiveRegistry, getExperience, listActiveRows };
