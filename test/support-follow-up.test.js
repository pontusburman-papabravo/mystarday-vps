'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('support follow-up link', () => {
  it('signs and verifies a numeric message id', () => {
    const { signSupportFollowUpToken, verifySupportFollowUpToken } = require('../src/lib/support-follow-up-token');
    const token = signSupportFollowUpToken(51);
    const ok = verifySupportFollowUpToken(token);
    assert.equal(ok.ok, true);
    assert.equal(ok.messageId, 51);
    assert.equal(verifySupportFollowUpToken(token.slice(0, -1) + 'x').ok, false);
    assert.equal(verifySupportFollowUpToken('sf1.51.not-a-sig').ok, false);
    const { supportFollowUpUrl } = require('../src/lib/support-follow-up-token');
    const url = supportFollowUpUrl(51);
    assert.match(url, /\/support\/svar\/sf1\.51\./);
  });

  it('wires public POST and svar page', () => {
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/support-follow-up.js'), 'utf8');
    const pages = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    const csrf = fs.readFileSync(path.join(ROOT, 'src/middleware/csrf.js'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(route, /router\.post\('\/follow-up'/);
    assert.match(route, /recordUserFollowUp/);
    assert.match(pages, /\/support\/svar\/:token/);
    assert.match(csrf, /\/support\/follow-up/);
    assert.match(index, /api\/support/);
  });
});
