'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function listJsFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJsFiles(full));
    else if (ent.name.endsWith('.js')) out.push(full);
  }
  return out;
}

describe('FEAT-1 cleanup — custody-resolver avvecklad', () => {
  it('custody-resolver.js removed from src', () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, 'src/lib/custody-resolver.js')),
      false,
      'custody-resolver.js ska vara borttagen efter Phase 4'
    );
  });

  it('no custody-resolver imports under src/', () => {
    const files = listJsFiles(path.join(ROOT, 'src'));
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      assert.doesNotMatch(
        src,
        /custody-resolver/,
        path.relative(ROOT, file) + ' must not import custody-resolver'
      );
      assert.doesNotMatch(
        src,
        /getWeekVariantForDate/,
        path.relative(ROOT, file) + ' must not call getWeekVariantForDate'
      );
    }
  });

  it('schedule-custody uses hemnamn placeholders — not Vecka A/B', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/schedule-custody.js'), 'utf8');
    assert.doesNotMatch(src, /Vecka A/);
    assert.doesNotMatch(src, /Vecka B/);
    assert.match(src, /calendar-week/);
  });

  it('custody-resolver test removed from gate', () => {
    const pkg = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    assert.doesNotMatch(pkg, /custody-resolver\.test\.js/);
  });
});
