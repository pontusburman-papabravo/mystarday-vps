/**
 * Test suite for welcome-mailer.js
 * Run with: node --test test/welcome-mailer.test.js
 */

const path = require('path');
const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

process.env.SMTP_HOST = 'smtp.test';
process.env.SMTP_USER = 'user';
process.env.SMTP_PASS = 'pass';
process.env.APP_URL = 'https://mystarday.se';

let mockChildRow = null;
let mockTemplateRow = null;
let mockUnsubRow = null;

const mockDb = {
  query: async (sql) => {
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

let capturedMail = null;
let smtpShouldFail = false;

const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  sendMail: async (opts) => {
    if (smtpShouldFail) throw new Error('SMTP auth failed');
    capturedMail = opts;
    return { messageId: 'test-id' };
  },
});

const emailPath = require.resolve(path.join(__dirname, '../src/lib/email'));
delete require.cache[emailPath];

const wfAbsPath = path.join(__dirname, '../src/lib/welcome-mailer.js');
delete require.cache[require.resolve(wfAbsPath)];
const { sendWelcomeEmail } = require(wfAbsPath);

function setMockRows({ template, child, unsub }) {
  mockTemplateRow = template || null;
  mockChildRow = child || null;
  mockUnsubRow = unsub || null;
}

function clearMockRows() {
  mockTemplateRow = null;
  mockChildRow = null;
  mockUnsubRow = null;
}

describe('sendWelcomeEmail', () => {
  beforeEach(() => {
    clearMockRows();
    capturedMail = null;
    smtpShouldFail = false;
    delete require.cache[emailPath];
  });

  it('sends email via SMTP with to, from, replyTo, subject, html', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}', body: 'Välkommen!' },
      unsub: { unsubscribe_token: 'tok123' },
    });

    await sendWelcomeEmail('anna@example.com', 'pid-1', { foralderns_namn: 'Anna' });

    assert.ok(capturedMail, 'SMTP sendMail was called');
    assert.strictEqual(capturedMail.to, 'anna@example.com');
    assert.strictEqual(capturedMail.subject, 'Hej Anna');
    assert.ok(capturedMail.html && capturedMail.html.includes('Välkommen!'));
    assert.ok(capturedMail.from && capturedMail.from.includes('info@mystarday.se'));
    assert.ok(capturedMail.replyTo && capturedMail.replyTo.includes('info@mystarday.se'));
  });

  it('queries ONLY welcome_email_template for the template', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Body' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(capturedMail.to, 'parent@test.com');
  });

  it('skips send gracefully when no active template exists', async () => {
    setMockRows({ template: null });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'No active template found');
    assert.strictEqual(capturedMail, null);
  });

  it('looks up child name from DB when barnets_namn is empty in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
      child: { name: 'Leo' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid-abc', { foralderns_namn: 'Anna' });

    assert.ok(capturedMail.subject.includes('Leo'));
    assert.ok(capturedMail.html.includes('Leo'));
  });

  it('does NOT look up child name when barnets_namn is already provided in vars', async () => {
    setMockRows({
      template: { subject: 'Ämne: {{barnets_namn}}', body: 'Hej {{barnets_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', {
      foralderns_namn: 'Anna',
      barnets_namn: 'Maja',
    });

    assert.ok(capturedMail.html.includes('Maja'));
    assert.ok(capturedMail.subject.includes('Maja'));
  });

  it('handles empty child result gracefully', async () => {
    setMockRows({
      template: { subject: 'Ämne {{barnets_namn}}', body: 'Body {{barnets_namn}}' },
      unsub: { unsubscribe_token: 'tok' },
      child: null,
    });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Anna' });

    assert.strictEqual(result.success, true);
    assert.ok(!capturedMail.subject.includes('{{barnets_namn}}'));
  });

  it('substitutes foralderns_namn in subject and body', async () => {
    setMockRows({
      template: { subject: 'Hej {{foralderns_namn}}!', body: 'Välkommen {{foralderns_namn}}!' },
      unsub: { unsubscribe_token: 'tok' },
    });

    await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Karin' });

    assert.ok(capturedMail.subject.includes('Karin'));
    assert.ok(capturedMail.html.includes('Karin'));
  });

  it('returns error when SMTP send fails', async () => {
    smtpShouldFail = true;
    setMockRows({
      template: { subject: 'Test', body: 'Body' },
    });

    const result = await sendWelcomeEmail('parent@test.com', 'pid', { foralderns_namn: 'Test' });

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
  });

  it('includes unsubscribe URL in email HTML footer', async () => {
    setMockRows({
      template: { subject: 'Test', body: 'Hej!' },
      unsub: { unsubscribe_token: 'tok-abc123' },
    });

    await sendWelcomeEmail('test@example.com', 'pid', { foralderns_namn: 'Test' });

    assert.ok(
      capturedMail.html.includes('/api/newsletter/unsubscribe?token=tok-abc123')
    );
  });
});
