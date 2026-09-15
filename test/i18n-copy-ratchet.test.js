'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ratchet = require('../scripts/lib/i18n-copy-ratchet');

describe('i18n copy ratchet', () => {
  it('baseline file is valid and matches the current scan', () => {
    const baseline = ratchet.loadBaseline();
    const formatError = ratchet.validateBaselineFormat(baseline);
    assert.equal(formatError, null, formatError);
    const current = ratchet.scanRepo();
    const result = ratchet.compareRatchet(current, baseline);
    assert.equal(result.formatError, null);
    assert.deepEqual(result.newHits, [], result.newHits.slice(0, 8).map((h) => `${h.path} [${h.rule}] ${h.snippet}`).join('\n'));
    assert.equal(result.ok, true);
    assert.equal(result.currentCount, baseline.hits.length);
  });

  it('new hardcoded showToast fails the ratchet', () => {
    const baseline = ratchet.loadBaseline();
    const current = ratchet.scanRepo();
    const extra = {
      id: 'ffffffffffffffff',
      path: 'public/js/does-not-exist-ratchet.js',
      rule: 'showToast',
      snippet: 'Kunde inte spara',
    };
    const result = ratchet.compareRatchet([...current, extra], baseline);
    assert.equal(result.ok, false);
    assert.equal(result.newHits.length, 1);
    assert.equal(result.newHits[0].id, extra.id);
  });

  it('removing a baseline hit is allowed (debt may shrink)', () => {
    const baseline = ratchet.loadBaseline();
    const current = ratchet.scanRepo().slice(0, Math.max(0, baseline.hits.length - 1));
    const result = ratchet.compareRatchet(current, baseline);
    assert.equal(result.ok, true);
    assert.ok(result.removedHits.length >= 1);
  });

  it('writeBaseline refuses to grow without force-raise', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-ratchet-'));
    const baselinePath = path.join(dir, 'baseline.json');
    fs.writeFileSync(baselinePath, ratchet.serializeBaseline([]));
    assert.throws(
      () => ratchet.writeBaseline([{ id: 'a', path: 'x.js', rule: 'showToast', snippet: 'Avbryt' }], baselinePath),
      (err) => err && err.code === 'I18N_RATCHET_FORCE_RAISE_REQUIRED'
    );
    const written = ratchet.writeBaseline(
      [{ id: 'a', path: 'x.js', rule: 'showToast', snippet: 'Avbryt' }],
      baselinePath,
      { forceRaise: true }
    );
    assert.equal(written.currentCount, 1);
  });

  it('invalid baseline format fails comparison', () => {
    const result = ratchet.compareRatchet([], { version: 99, hits: [] });
    assert.equal(result.ok, false);
    assert.match(result.formatError, /unsupported baseline version/);
  });

  it('committed baseline does not store env secret values', () => {
    const raw = fs.readFileSync(ratchet.BASELINE_PATH, 'utf8');
    for (const key of ['EMAIL_FROM_NAME', 'R2_BUCKET_NAME']) {
      const val = process.env[key];
      if (!val || val.length < 4) continue;
      assert.equal(raw.includes(val), false, `${key} value must not appear in committed baseline`);
    }
  });
});
