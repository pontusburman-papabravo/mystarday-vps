'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('admin contact message reply', () => {
  it('contact-message-reply builds localized subject + bodies', () => {
    const mod = require('../src/lib/contact-message-reply');
    assert.equal(mod.buildReplySubject('feedback'), 'Re: Din feedback');
    const bodies = mod.buildReplyBodies({
      recipientName: 'Anna',
      originalMessage: '<b>Hej</b>, jag fastnade i appen.',
      replyBody: 'Tack för att du hörde av dig! Vi har fixat navigeringen.',
    });
    assert.match(bodies.text, /Tack för att du hörde av dig/);
    assert.match(bodies.html, /&lt;b&gt;Hej&lt;\/b&gt;/);
    assert.doesNotMatch(bodies.text, /Svara i ärendet/);
    const withLink = mod.buildReplyBodies({
      recipientName: 'Anna',
      originalMessage: 'Hej',
      replyBody: 'Tack för att du hörde av dig! Vi har fixat navigeringen.',
      followUpUrl: 'https://example.test/support/svar/token',
    });
    assert.match(withLink.text, /example\.test\/support\/svar\/token/);
    assert.match(withLink.html, /Svara i ärendet/);
  });

  it('admin contact-messages route exposes POST /:id/reply', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/contact-messages.js'), 'utf8');
    assert.match(src, /router\.post\('\/contact-messages\/:id\/reply'/);
    assert.match(src, /sendEmail/);
    assert.match(src, /recordMessageReply/);
    assert.match(src, /supportFollowUpUrl/);
    assert.match(src, /config\.email\.from/);
  });

  it('db contact-messages records reply and marks answered', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/contact-messages.js'), 'utf8');
    assert.match(src, /async function recordMessageReply/);
    assert.match(src, /async function recordUserFollowUp/);
    assert.match(src, /user_reply/);
    assert.match(src, /Användarsvar/);
    assert.match(src, /archived_at = NULL/);
    assert.match(src, /status = 'answered'/);
    assert.match(src, /--- Svar /);
  });

  it('admin inbox UI can send reply from Meddelanden', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-messages-inbox.js'), 'utf8');
    assert.match(src, /sendMessageReply/);
    assert.match(src, /\/api\/admin\/contact-messages\//);
    assert.match(src, /Svara användaren via e-post/);
    assert.match(src, /renderReplyHistory/);
    assert.match(src, /user_reply/);
  });
});
