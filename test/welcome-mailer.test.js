/**
 * Test suite for welcome-mailer.js
 * Run with: node --test test/welcome-mailer.test.js
 *
 * welcome-mailer.js delegates to sendEmail() in email.js (Resend API).
 */

const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.RESEND_API_KEY = 're_test_key';
process.env.APP_URL = 'https://mystarday.se';

let mockChildRow = null;
let mockTemplateRow = null;
let mockUnsubRow = null;

const mockDb = {
  query: async (sql, params) => {
    if (sql.includes('welcome_email_template')) return { rows: mockTemplateRow ? [mockTemplateRow] : [] };
    if (sql.includes('email_subscriptions') && sql.includes('unsubscribe_token')) return { rows: mockUnsubRow ? [mockUnsubRow] : [] };
    if (sql.includes('JOIN parent_child')) {
      if (mockChildRow) return { rows: [mockChildRow] };
      return { rows: [] };
    }
    return { rows: [] };
  },
};

const dbAbsPath = require.resolve(path.join(__dirname, '../src/lib/db'));
require.cache[dbAbsPath] = { exports: mockDb };

let capturedBody = null;
const originalFetch = global.fetch;

global.fetch = async (url, opts) => {
  if (url === 'https://api.resend.com/emails') {
    capturedBody = opts?.body ? JSON.parse(opts.body) : null;
    return { ok: true, status: 200, json: async () => ({ id: 'test-id' }), text: async () => '{"id":"test-id"}' };
  }
  return originalFetch(url, opts);
};

const wfAbsPath = path.join(__dirname, '../src/lib/welcome-mailer.js');
delete require.cache[require.resolve(wfAbsPath)];
delete require.cache[require.resolve(path.join(__dirname, '../src/lib/email.js'))];
const { sendWelcomeEmail } = require(wfAbsPath);

function setMockRows({ template, child, unsub }) {
  mockTemplateRow = template || null;
  mockChildRow    = child    || null;
  mockUnsubRow    = unsub    || null;
}

function clearMockRows() {
  mockTemplateRow = null;
  mockChildRow    = null;
  mockUnsubRow    = null;
}

function getRequestBody() {
  return capturedBody;
}

describe('sendWelcomeEmail', () => {

  beforeEach(() => {
    clearMockRows();
    capturedBody = null;
  });

  it('sends email via Resend with to, from, subject, html, text', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}', body: 'Välkommen!' },
      unsub: { unsubscribe_token: 'tok123' },
    });

    await sendWelcomeEmail('anna@acme.se', 'pid-1', { foralderns_namn: 'Anna' });

    const body = getRequestBody();
    assert.ok(body, 'Request was made to Resend');
    assert.deepStrictEqual(body.to, ['anna@acme.se']);
    assert.strictEqual(body.subject, 'Hej Anna');
    assert.ok(body.html && body.html.includes('Välkommen!'));
    assert.ok(body.from && body.from.includes('info@mystarday.se'));
    assert.strictEqual(body.reply_to, 'info@mystarday.se');
  });

  it('queries ONLY welcome_email_template (not email_templates) for the template', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Body' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@acme.se', 'pid', { foralderns_namn: 'Test' });

    assert.deepStrictEqual(capturedBody.to, ['parent@acme.se'], 'Email was sent — welcome_email_template was found');
  });

  it('skips send gracefully when no active template exists', async () => {
    setMockRows({ template: null });

    const result = await sendWelcomeEmail('parent@acme.se', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'No active template found');
    assert.strictEqual(capturedBody, null, 'Resend must not be called');
  });

  it('looks up child name from DB when barnets_namn is empty in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
      child: { name: 'Leo' },
    });

    await sendWelcomeEmail('parent@acme.se', 'pid-abc', { foralderns_namn: 'Anna' });

    const body = getRequestBody();
    assert.ok(body, 'Email was sent');
    assert.ok(body.subject.includes('Leo'), `Subject must contain resolved child name "Leo", got: ${body.subject}`);
    assert.ok(body.html.includes('Leo'), 'Body must contain resolved child name "Leo"');
  });

  it('does NOT look up child name when barnets_namn is already provided in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@acme.se', 'pid', {
      foralderns_namn: 'Anna',
      barnets_namn: 'Maja',
    });

    const body = getRequestBody();
    assert.ok(body, 'Email was sent');
    assert.ok(body.html.includes('Maja'), 'Body must use provided barnets_namn "Maja"');
    assert.ok(body.subject.includes('Maja'), 'Subject must use provided name "Maja"');
  });

  it('handles empty child result gracefully (no linked child at registration time)', async () => {
    setMockRows({
      template: { subject: 'Ämne {{barnets_namn}}', body: 'Body {{barnets_namn}}' },
      unsub: { unsubscribe_token: 'tok' },
      child: null,
    });

    const result = await sendWelcomeEmail('parent@acme.se', 'pid', { foralderns_namn: 'Anna' });

    assert.strictEqual(result.success, true, 'Email must still send even with no child');
    const body = getRequestBody();
    assert.ok(!body.subject.includes('{{barnets_namn}}'), 'Subject must not contain unsubstituted {{barnets_namn}}');
  });

  it('substitutes foralderns_namn in subject and body', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}!', body: 'Välkommen {{foralderns_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@acme.se', 'pid', { foralderns_namn: 'Karin' });

    const body = getRequestBody();
    assert.ok(body.subject.includes('Karin'), 'Subject must contain "Karin"');
    assert.ok(body.html.includes('Karin'), 'Body must contain "Karin"');
  });

  it('skips send and returns error when Resend returns failure', async () => {
    const prevFetch = global.fetch;
    global.fetch = async (url, opts) => {
      if (url === 'https://api.resend.com/emails') {
        return { ok: false, status: 401, text: async () => '{"message":"Invalid API key"}', json: async () => ({ message: 'Invalid API key' }) };
      }
      return prevFetch(url, opts);
    };

    setMockRows({
      template: { subject: 'Test', body: 'Body' },
    });

    const result = await sendWelcomeEmail('parent@acme.se', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.ok(result.error, 'Error must be returned');

    global.fetch = prevFetch;
  });

  it('includes unsubscribe URL in email HTML footer', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Hej!' },
      unsub: { unsubscribe_token: 'tok-abc123' },
    });

    await sendWelcomeEmail('test@acme.se', 'pid', { foralderns_namn: 'Test' });

    const body = getRequestBody();
    assert.ok(
      body.html.includes('/api/newsletter/unsubscribe?token=tok-abc123'),
      'HTML footer must include unsubscribe URL'
    );
  });
});
