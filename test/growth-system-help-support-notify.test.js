'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { setupTestDb } = require('./helpers/setup.js');

function mockSendEmail(handler) {
  const emailPath = require.resolve('../src/lib/email');
  const previousEmail = require.cache[emailPath];
  require.cache[emailPath] = {
    id: emailPath,
    filename: emailPath,
    loaded: true,
    exports: {
      ...require('../src/lib/email'),
      sendEmail: handler,
    },
  };
  return () => {
    if (previousEmail) require.cache[emailPath] = previousEmail;
    else delete require.cache[emailPath];
  };
}

describe('growth-system-help-support-notify', () => {
  const {
    buildSupportReportEmailSubject,
    buildSupportReportEmailBody,
    assertBodySafe,
    notifyRecipient,
    NOTIFY_SENT_KEY,
    adminInboxUrl,
  } = require('../src/lib/growth-system-help-support-notify');
  const config = require('../src/lib/config');

  it('builds Swedish subject with blocking step', () => {
    assert.equal(
      buildSupportReportEmailSubject('schema_no_child_login'),
      `[${config.email.fromName}] Problemrapport: schema_no_child_login`
    );
  });

  it('builds fallback subject without blocking step', () => {
    assert.equal(
      buildSupportReportEmailSubject(null),
      `[${config.email.fromName}] Ny problemrapport från systemhjälpen`
    );
  });

  it('includes required fields in email body', () => {
    const body = buildSupportReportEmailBody({
      contactMessageId: 47,
      familyId: 'fam-uuid',
      familyName: 'Familjen Test',
      parentName: 'Anna',
      parentEmail: 'anna@example.com',
      row: { blocking_step: 'schema_no_child_login', help_type: 'preview_child_login_help' },
      context: {
        surface: 'help_panel',
        route: '/schedule',
        locale: 'sv-SE',
        platform: 'ios',
        user_agent: 'Mozilla/5.0',
        timestamp: '2026-08-18T15:00:00.000Z',
      },
    });
    assert.match(body, /Familjen Test/);
    assert.match(body, /fam-uuid/);
    assert.match(body, /Anna/);
    assert.match(body, /anna@example.com/);
    assert.match(body, /schema_no_child_login/);
    assert.match(body, /preview_child_login_help/);
    assert.match(body, /help_panel/);
    assert.match(body, /\/schedule/);
    assert.match(body, /Contact message ID: 47/);
    assert.match(body, new RegExp(adminInboxUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });

  it('rejects secrets in email body', () => {
    assert.throws(
      () => assertBodySafe('access_token=leak'),
      /secret scan/i
    );
    assert.throws(() => assertBodySafe('csrf_token=abc'), /secret scan/i);
    assert.throws(() => assertBodySafe('password: secret'), /secret scan/i);
    assert.throws(() => assertBodySafe('child pin 1234'), /secret scan/i);
    assert.throws(() => assertBodySafe('Authorization: Bearer x'), /secret scan/i);
  });

  it('uses configured notify recipient with env fallback', () => {
    const prev = process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL;
    process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL = 'ops@test.example.com';
    assert.equal(notifyRecipient(), 'ops@test.example.com');
    delete process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL;
    assert.ok(notifyRecipient());
    if (prev) process.env.GROWTH_SYSTEM_HELP_REPORT_EMAIL = prev;
  });

  describe('notifySupportReportSaved integration', () => {
    let db;
    let sentEmails;
    let restoreEmail;
    let restoreNotify;

    before(async () => {
      db = await setupTestDb();
    });

    after(async () => {
      if (restoreEmail) restoreEmail();
      if (restoreNotify) restoreNotify();
      if (db && !db.skip && db.cleanup) await db.cleanup();
    });

    async function insertContactMessage(familyId) {
      const result = await db.query(
        `INSERT INTO contact_message (name, email, message, message_type, family_id, metadata)
         VALUES ('QA', 'qa@example.com', '[Systemhjälp — Rapportera problem]', 'bug', $1, '{}'::jsonb)
         RETURNING id`,
        [familyId]
      );
      return result.rows[0].id;
    }

    async function createFamily() {
      const result = await db.query(
        `INSERT INTO family (name, timezone) VALUES ('Notify Test Family', 'Europe/Stockholm') RETURNING id`
      );
      return result.rows[0].id;
    }

    it('sends exactly one internal email per contact_message id', async (t) => {
      if (db.skip) {
        t.skip('No real DATABASE_URL');
        return;
      }

      sentEmails = [];
      restoreEmail = mockSendEmail(async (opts) => {
        sentEmails.push(opts);
        return { success: true, provider: 'test' };
      });
      delete require.cache[require.resolve('../src/lib/growth-system-help-support-notify')];
      const { notifySupportReportSaved } = require('../src/lib/growth-system-help-support-notify');
      restoreNotify = () => {
        delete require.cache[require.resolve('../src/lib/growth-system-help-support-notify')];
      };

      const familyId = await createFamily();
      const contactMessageId = await insertContactMessage(familyId);

      const input = {
        contactMessageId,
        familyId,
        parentName: 'QA Parent',
        parentEmail: 'parent@example.com',
        row: { blocking_step: 'schema_no_child_login', help_type: 'preview_child_login_help' },
        context: {
          surface: 'help_panel',
          route: '/schedule',
          locale: 'sv-SE',
          timestamp: '2026-08-18T15:00:00.000Z',
        },
      };

      const first = await notifySupportReportSaved(input);
      const second = await notifySupportReportSaved(input);

      assert.equal(first.sent, true);
      assert.equal(second.sent, false);
      assert.equal(second.skipped, 'dedupe');
      assert.equal(sentEmails.length, 1);
      assert.match(sentEmails[0].subject, /schema_no_child_login/);
      assert.match(sentEmails[0].body, /Contact message ID/);

      const meta = await db.query('SELECT metadata FROM contact_message WHERE id = $1', [contactMessageId]);
      assert.ok(meta.rows[0].metadata[NOTIFY_SENT_KEY]);
    });

    it('fail-open: keeps contact_message and releases dedupe slot on mail failure', async (t) => {
      if (db.skip) {
        t.skip('No real DATABASE_URL');
        return;
      }

      restoreEmail = mockSendEmail(async () => {
        throw new Error('provider down');
      });
      delete require.cache[require.resolve('../src/lib/growth-system-help-support-notify')];
      const { notifySupportReportSaved } = require('../src/lib/growth-system-help-support-notify');

      const familyId = await createFamily();
      const contactMessageId = await insertContactMessage(familyId);

      const result = await notifySupportReportSaved({
        contactMessageId,
        familyId,
        parentEmail: 'parent@example.com',
        row: { blocking_step: 'login_no_completion', help_type: 'first_star_help' },
        context: { surface: 'help_panel', route: '/daily-log' },
      });

      assert.equal(result.sent, false);
      assert.match(result.error || '', /provider down/);

      const meta = await db.query('SELECT metadata FROM contact_message WHERE id = $1', [contactMessageId]);
      assert.equal(meta.rows[0].metadata?.[NOTIFY_SENT_KEY], undefined);
    });
  });
});

describe('recordSupportRequested notify hook', () => {
  let db;
  let restoreEmail;
  let restoreModules;

  before(async () => {
    db = await setupTestDb();
  });

  after(async () => {
    if (restoreEmail) restoreEmail();
    if (restoreModules) restoreModules();
    if (db && !db.skip && db.cleanup) await db.cleanup();
  });

  it('stores contact_message, analytics, and triggers notify after save', async (t) => {
    if (db.skip) {
      t.skip('No real DATABASE_URL');
      return;
    }

    const sent = [];
    restoreEmail = mockSendEmail(async (opts) => {
      sent.push(opts);
      return { success: true };
    });

    delete require.cache[require.resolve('../src/lib/growth-system-help-support-notify')];
    delete require.cache[require.resolve('../src/lib/growth-system-help')];
    restoreModules = () => {
      delete require.cache[require.resolve('../src/lib/growth-system-help-support-notify')];
      delete require.cache[require.resolve('../src/lib/growth-system-help')];
    };
    const { recordSupportRequested } = require('../src/lib/growth-system-help');

    const fam = await db.query(
      `INSERT INTO family (name, timezone, created_at) VALUES ('Support Hook', 'Europe/Stockholm', NOW() - INTERVAL '5 days') RETURNING id`
    );
    const familyId = fam.rows[0].id;
    await db.query(
      `INSERT INTO parent (family_id, email, password_hash, name, onboarding_completed)
       VALUES ($1, 'hook@example.com', 'x', 'Hook Parent', true)`,
      [familyId]
    );
    await db.query(
      `INSERT INTO family_system_help_state (family_id, blocking_step, help_type, stuck_detected_at)
       VALUES ($1, 'schema_no_child_login', 'preview_child_login_help', NOW())`,
      [familyId]
    );

    const row = await recordSupportRequested(familyId, {
      surface: 'help_panel',
      parentEmail: 'hook@example.com',
      parentName: 'Hook Parent',
      context: {
        surface: 'help_panel',
        route: '/schedule',
        locale: 'sv-SE',
        access_token: 'must-not-appear',
        csrf_token: 'must-not-appear',
      },
    });

    assert.ok(row);
    const msg = await db.query(
      `SELECT id FROM contact_message WHERE family_id = $1 ORDER BY id DESC LIMIT 1`,
      [familyId]
    );
    assert.ok(msg.rows[0]?.id);
    assert.equal(sent.length, 1);
    assert.doesNotMatch(sent[0].body, /access_token/);
    assert.doesNotMatch(sent[0].body, /csrf_token/);

    const ev = await db.query(
      `SELECT 1 FROM analytics_events WHERE family_id = $1 AND event_type = 'system_help_support_requested'`,
      [familyId]
    );
    assert.equal(ev.rows.length, 1);
  });
});
