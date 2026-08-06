'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('R4.1 — child-first post-schema handoff', () => {
  loadLocales();

  for (const lang of ['sv-SE', 'en-GB']) {
    it(`${lang} home.handoff.postSchema keys are defined`, () => {
      for (const part of ['title', 'sub', 'childLogin', 'regionAria']) {
        const key = `home.handoff.postSchema.${part}`;
        const value = t(lang, key);
        assert.notEqual(value, key, `missing ${key}`);
        assert.ok(value.length > 0);
      }
    });
  }

  it('dashboard-child-handoff exports post-schema helpers', () => {
    const src = read('public/js/dashboard-child-handoff.js');
    assert.match(src, /applyLegacyHandoffCopy/);
    assert.match(src, /applyMagicHandoffCopy/);
    assert.match(src, /loadActivationHandoffNeeded/);
    assert.match(src, /dash-child-handoff-post-schema/);
    assert.match(src, /parent-i18n-ready/);
    assert.match(src, /child_handoff_started/);
    assert.match(src, /child_view_opened/);
    assert.match(src, /dashboard_handoff/);
  });

  it('magic hub syncs post-schema handoff after activation state', () => {
    const src = read('public/js/dashboard-home-hub.js');
    assert.match(src, /syncPostSchemaHandoffCard/);
    assert.match(src, /child_access/);
    assert.match(src, /applyMagicHandoffCopy/);
  });

  it('en-GB post-schema copy aligns with journey registry handoff_to_child', async () => {
    const { loadRegistry } = require('../src/lib/journey/registry');
    const registry = await loadRegistry({ useDb: false, locale: 'en-GB' });
    const exp = registry.phases.FIRST_USE.handoff_to_child;
    const title = t('en-GB', 'home.handoff.postSchema.title');
    const cta = t('en-GB', 'home.handoff.postSchema.childLogin');
    assert.equal(exp.headline, 'Let your child try their routine');
    assert.match(title, /Let your child try their routine/i);
    assert.equal(exp.cta, cta);
  });
});
