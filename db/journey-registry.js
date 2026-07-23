'use strict';

const db = require('../src/lib/db');
const { journeyLocaleCandidates, resolveFamilyLocale } = require('../src/lib/locale');

async function getActiveRegistry(locale = 'sv-SE') {
  const candidates = journeyLocaleCandidates(locale);

  for (const loc of candidates) {
    const result = await db.query(
      `SELECT version, phase, experience_key, tone, headline, body, cta
       FROM journey_experience_registry
       WHERE is_active = true AND locale = $1
       ORDER BY version DESC, phase, experience_key`,
      [loc]
    );
    if (result.rows.length) {
      return buildRegistryFromRows(result.rows);
    }
  }

  return null;
}

function buildRegistryFromRows(rows) {
  const version = rows[0].version;
  const phases = {};
  for (const row of rows) {
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

async function getExperience(version, phase, experienceKey, locale = 'sv-SE') {
  const candidates = journeyLocaleCandidates(locale);
  for (const loc of candidates) {
    const result = await db.query(
      `SELECT tone, headline, body, cta FROM journey_experience_registry
       WHERE version = $1 AND phase = $2 AND experience_key = $3 AND locale = $4 AND is_active = true
       LIMIT 1`,
      [version, phase, experienceKey, loc]
    );
    if (result.rows[0]) return result.rows[0];
  }
  return null;
}

async function listActiveRows(locale = 'sv-SE') {
  const candidates = journeyLocaleCandidates(locale);
  for (const loc of candidates) {
    const result = await db.query(
      `SELECT version, phase, experience_key, tone, headline, body, cta, locale, is_active
       FROM journey_experience_registry
       WHERE is_active = true AND locale = $1
       ORDER BY version DESC, phase, experience_key`,
      [loc]
    );
    if (result.rows.length) return result.rows;
  }
  return [];
}

async function getFamilyLocale(familyId) {
  if (!familyId) return 'sv-SE';
  const result = await db.query(
    `SELECT COALESCE(preferred_locale, 'sv-SE') AS preferred_locale FROM family WHERE id = $1`,
    [familyId]
  );
  return resolveFamilyLocale(result.rows[0]?.preferred_locale);
}

module.exports = {
  getActiveRegistry,
  getExperience,
  listActiveRows,
  getFamilyLocale,
  buildRegistryFromRows,
};
