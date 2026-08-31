'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ooo = require('../config/support-ooo');

function stockholmNoon(isoDate) {
  return new Date(`${isoDate}T12:00:00+02:00`);
}

describe('support OOO window (Sept 2026)', () => {
  it('is inactive before 1 September Stockholm time', () => {
    assert.equal(ooo.isOooActive(stockholmNoon('2026-08-31')), false);
  });

  it('is active 1–11 September Stockholm time', () => {
    assert.equal(ooo.isOooActive(stockholmNoon('2026-09-01')), true);
    assert.equal(ooo.isOooActive(stockholmNoon('2026-09-10')), true);
    assert.equal(ooo.isOooActive(stockholmNoon('2026-09-11')), true);
  });

  it('is inactive from 12 September', () => {
    assert.equal(ooo.isOooActive(stockholmNoon('2026-09-12')), false);
  });

  it('fallback reply does not invent a product answer', () => {
    const sv = ooo.copyForLocale('sv-SE');
    assert.match(sv.replyFallback, /bortresta/);
    assert.match(sv.replyFallback, /11 september/);
    assert.equal(sv.replyFallback.includes('PIN'), false);
    const en = ooo.copyForLocale('en');
    assert.match(en.replyFallback, /11 September/);
  });

  it('public script and support-bubble keep the same date window', () => {
    const client = fs.readFileSync(path.join(ROOT, 'public/js/support-ooo.js'), 'utf8');
    const bubble = fs.readFileSync(path.join(ROOT, 'public/js/support-bubble.js'), 'utf8');
    assert.match(client, new RegExp(`FROM_DATE = '${ooo.FROM_DATE}'`));
    assert.match(client, new RegExp(`THROUGH_DATE = '${ooo.THROUGH_DATE}'`));
    assert.match(bubble, new RegExp(`SUPPORT_OOO_FROM = '${ooo.FROM_DATE}'`));
    assert.match(bubble, new RegExp(`SUPPORT_OOO_THROUGH = '${ooo.THROUGH_DATE}'`));
    assert.match(bubble, /auth\.supportBubble\.oooSubtitle/);
    assert.match(bubble, /auth\.supportBubble\.oooSuccess/);
  });

  it('locale files have matching OOO keys', () => {
    const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/sv-SE.json'), 'utf8'));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en-GB.json'), 'utf8'));
    assert.equal(sv.auth.supportBubble.oooSubtitle, ooo.COPY['sv-SE'].subtitle);
    assert.equal(sv.auth.supportBubble.oooSuccess, ooo.COPY['sv-SE'].success);
    assert.equal(en.auth.supportBubble.oooSubtitle, ooo.COPY['en-GB'].subtitle);
    assert.equal(en.auth.supportBubble.oooSuccess, ooo.COPY['en-GB'].success);
  });

  it('playbook requires how-to for known tasks even when typed as bug', () => {
    const doc = fs.readFileSync(path.join(ROOT, 'docs/support-ooo-sept-2026.md'), 'utf8');
    assert.match(doc, /message_type=bug/);
    assert.match(doc, /jag kan inte/i);
    assert.match(doc, /Namn & emoji/);
  });

  it('contact pages load support-ooo.js', () => {
    const sv = fs.readFileSync(path.join(ROOT, 'public/kontakt.html'), 'utf8');
    const en = fs.readFileSync(path.join(ROOT, 'public/en-contact.html'), 'utf8');
    assert.match(sv, /support-ooo\.js/);
    assert.match(en, /support-ooo\.js/);
  });
});
