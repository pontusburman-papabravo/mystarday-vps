'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

/** console.log/info/warn lines must not interpolate raw email variables (N12). */
const FORBIDDEN_PATTERNS = [
  /\$\{[^}]*\.email\}/,
  /\$\{[^}]*parent_email\}/,
  /\$\{normalizedEmail\}/,
  /\$\{parentEmail\}/,
  /to=\$\{to\}/,
  /to=\$\{recipients\.join/,
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith('.js')) files.push(p);
  }
  return files;
}

describe('N12 PII logging contract', () => {
  it('no console.log/info/warn with raw email interpolation in src/', () => {
    const violations = [];
    for (const file of walk(SRC)) {
      const rel = path.relative(ROOT, file);
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/console\.(log|info|warn)/.test(line)) return;
        if (line.includes('maskEmail') || line.includes('maskToField')) return;
        for (const re of FORBIDDEN_PATTERNS) {
          if (re.test(line)) {
            violations.push(`${rel}:${i + 1}: ${line.trim()}`);
          }
        }
      });
    }
    assert.equal(
      violations.length,
      0,
      `Raw email in logs:\n${violations.join('\n')}`
    );
  });
});
