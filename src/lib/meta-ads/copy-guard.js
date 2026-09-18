'use strict';

/**
 * Blocks fear-based NPF copy, fake urgency, and medical claims (COS 008).
 * Founder still reviews every ad — this is a hard floor, not the full review.
 */

const FORBIDDEN_PATTERNS = Object.freeze([
  { id: 'cure_autism', re: /\bbota\s+autism/i, message: 'Påstår att appen botar autism' },
  { id: 'cure_adhd', re: /\bbota\s+adhd/i, message: 'Påstår att appen botar ADHD' },
  { id: 'diagnose', re: /\bdiagnostiser/i, message: 'Påstår diagnostik — appen är inte vård' },
  { id: 'treatment', re: /\b(utan behandling|ersätter medicin|måste ha medicin)\b/i, message: 'Medicinskt påstående' },
  { id: 'last_chance', re: /\bsista chansen\b/i, message: 'Falsk brådska' },
  { id: 'only_today', re: /\b(bara idag|endast idag|only today)\b/i, message: 'Falsk brådska' },
  { id: 'limited_spots', re: /\b(begränsat antal( platser)?|limited spots)\b/i, message: 'Falsk knapphet' },
  { id: 'school_fail', re: /\b(misslyckas i skolan|kommer halka efter)\b/i, message: 'Rädslobaserad NPF-copy' },
  { id: 'broken_child', re: /\b(trasigt barn|fixa barnet)\b/i, message: 'Kränkande barncopy' },
]);

function collectCopyFields(brief) {
  return [
    brief.name,
    brief.primary_text,
    brief.headline,
    brief.description,
    brief.hypothesis,
    brief.notes,
  ]
    .filter((value) => value != null && String(value).trim() !== '')
    .map((value) => String(value));
}

function findCopyViolations(brief) {
  const fields = collectCopyFields(brief);
  const violations = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (fields.some((text) => pattern.re.test(text))) {
      violations.push({ id: pattern.id, message: pattern.message });
    }
  }
  return violations;
}

function assertCopyAllowed(brief) {
  const violations = findCopyViolations(brief);
  if (violations.length) {
    const error = new Error(
      'Annonskopian bryter mot tillväxtreglerna: ' + violations.map((v) => v.message).join('; ')
    );
    error.code = 'META_ADS_COPY_BLOCKED';
    error.violations = violations;
    throw error;
  }
}

module.exports = {
  FORBIDDEN_PATTERNS,
  findCopyViolations,
  assertCopyAllowed,
};
