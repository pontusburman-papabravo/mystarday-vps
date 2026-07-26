'use strict';

/**
 * Limited detector for Swedish *system* copy in English-locale smoke tests.
 * Intentionally narrow — flags common UI chrome, not user-authored content.
 */

const SYSTEM_PHRASES = [
  'Logga in',
  'Logga ut',
  'Skapa konto',
  'Glömt lösenord',
  'Spara',
  'Avbryt',
  'Tillbaka',
  'Inställningar',
  'Belöningar',
  'Planering',
  'Familj',
  'Översikt',
  'Schema',
  'Laddar',
  'Något gick fel',
  'Välkommen tillbaka',
  'E-postadress',
  'Lösenord',
  'Jag är barn',
  'Min panel',
  'Skattkammaren',
  'För dig',
  'Notiser',
];

const SYSTEM_REGEX = [
  /\bLogga in\b/,
  /\bSpara\b/,
  /\bAvbryt\b/,
  /\bTillbaka\b/,
  /\bNästa\b/,
  /\bInställningar\b/,
  /\bBelöningar\b/,
  /\bPlanering\b/,
  /\bÖversikt\b/,
  /\bLaddar\b/,
  /\bNågot gick fel\b/,
  /\bGlömt lösenord\b/,
];

function normalizeAllowlist(allowlist = []) {
  return allowlist
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter((s) => s.length > 0);
}

function stripAllowlisted(text, allowlist) {
  let out = text;
  for (const token of allowlist) {
    out = out.split(token).join('');
  }
  return out;
}

/**
 * @param {string} text - visible page text
 * @param {{ allowlist?: string[], context?: string }} [opts]
 * @returns {{ ok: boolean, hits: Array<{ kind: string, match: string }> }}
 */
function detectSwedishSystemCopy(text, opts = {}) {
  const allowlist = normalizeAllowlist(opts.allowlist);
  const cleaned = stripAllowlisted(String(text || ''), allowlist);
  const hits = [];

  for (const phrase of SYSTEM_PHRASES) {
    if (cleaned.includes(phrase)) {
      hits.push({ kind: 'phrase', match: phrase });
    }
  }

  for (const re of SYSTEM_REGEX) {
    const m = cleaned.match(re);
    if (m) {
      const already = hits.some((h) => h.match === m[0]);
      if (!already) hits.push({ kind: 'regex', match: m[0] });
    }
  }

  return { ok: hits.length === 0, hits };
}

module.exports = { detectSwedishSystemCopy, SYSTEM_PHRASES };
