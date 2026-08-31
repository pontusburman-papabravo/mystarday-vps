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

  it('wires public GET thread, POST follow-up and svar page', () => {
    const route = fs.readFileSync(path.join(ROOT, 'src/routes/support-follow-up.js'), 'utf8');
    const pages = fs.readFileSync(path.join(ROOT, 'src/routes/public-pages.js'), 'utf8');
    const csrf = fs.readFileSync(path.join(ROOT, 'src/middleware/csrf.js'), 'utf8');
    const index = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    assert.match(route, /router\.get\('\/thread'/);
    assert.match(route, /router\.post\('\/follow-up'/);
    assert.match(route, /getPublicThread/);
    assert.match(route, /recordUserFollowUp/);
    assert.match(pages, /\/support\/svar\/:token/);
    assert.match(csrf, /\/support\/follow-up/);
    assert.match(index, /api\/support/);
  });

  it('builds a public thread from original + events without leaking notes', () => {
    const { buildPublicSupportThread } = require('../src/lib/support-thread');
    const thread = buildPublicSupportThread({
      createdAt: '2026-08-31T10:00:00.000Z',
      message: 'Jag kan inte byta namn\n\n--- Användarsvar 2026-08-31 11:00 ---\nFortfarande samma',
      internalNote: 'Ringde skolan\n\n--- Svar 2026-08-31 10:30 ---\nGå till Familj\n(Resend: abc)',
      events: [
        {
          event_type: 'reply_sent',
          created_at: '2026-08-31T10:30:00.000Z',
          payload: { body: 'Gå till Familj', email_id: 'abc' },
        },
        {
          event_type: 'user_reply',
          created_at: '2026-08-31T11:00:00.000Z',
          payload: { body: 'Fortfarande samma' },
        },
      ],
    });
    assert.deepEqual(thread.map((t) => t.role), ['user', 'support', 'user']);
    assert.equal(thread[0].body, 'Jag kan inte byta namn');
    assert.equal(thread[1].body, 'Gå till Familj');
    assert.equal(thread[2].body, 'Fortfarande samma');
    assert.equal(thread.some((t) => /Ringde|Resend/.test(t.body)), false);
  });

  it('builds a receipt that points at the signed thread', () => {
    const { buildReceiptBodies, shouldSendSupportReceipt, threadPath } = require('../src/lib/support-receipt');
    assert.equal(shouldSendSupportReceipt('landing-share@example.se'), false);
    assert.equal(shouldSendSupportReceipt('parent@example.com'), true);
    assert.match(threadPath(4), /\/support\/svar\/sf1\.4\./);
    const sv = buildReceiptBodies({
      recipientName: 'Anna',
      followUpUrl: 'https://example.test/support/svar/token',
      locale: 'sv',
    });
    assert.match(sv.subject, /ärende/i);
    assert.match(sv.text, /example\.test\/support\/svar\/token/);
    assert.match(sv.html, /Öppna ditt ärende/);
    const en = buildReceiptBodies({
      recipientName: 'Anna',
      followUpUrl: 'https://example.test/support/svar/token',
      locale: 'en',
    });
    assert.match(en.html, /Open your conversation/);
  });

  it('falls back to stored blocks when events have no body', () => {
    const { buildPublicSupportThread } = require('../src/lib/support-thread');
    const thread = buildPublicSupportThread({
      createdAt: '2026-08-31T10:00:00.000Z',
      message: 'Hej\n\n--- Användarsvar 2026-08-31 11:00 ---\nNy fråga',
      internalNote: '--- Svar 2026-08-31 10:20 ---\nSå här gör du',
      events: [{ event_type: 'reply_sent', created_at: '2026-08-31T10:20:00.000Z', payload: { email_id: 'x' } }],
    });
    assert.equal(thread.length, 3);
    assert.equal(thread[1].role, 'support');
    assert.equal(thread[1].body, 'Så här gör du');
    assert.equal(thread[2].role, 'user');
    assert.equal(thread[2].body, 'Ny fråga');
  });
});
