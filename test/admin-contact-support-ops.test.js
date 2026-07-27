'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('admin contact message support ops', () => {
  it('support taxonomy defines root causes and resolution types', () => {
    const tax = require('../config/support-taxonomy');
    assert.ok(tax.ROOT_CAUSES.navigation_ui);
    assert.ok(tax.RESOLUTION_TYPES.bugfix_deployed);
    assert.equal(tax.AUTO_ARCHIVE_DAYS, 14);
    assert.equal(tax.isValidRootCause('navigation_ui'), true);
    assert.equal(tax.isValidRootCause('not_real'), false);
  });

  it('migration adds resolution fields and event log table', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'migrations/1810000000011_contact_message_support_ops.js'),
      'utf8'
    );
    assert.match(src, /root_cause/);
    assert.match(src, /contact_message_event/);
    assert.match(src, /archived_at/);
  });

  it('db contact-messages exposes resolution, archive, analytics, auto-archive', () => {
    const src = fs.readFileSync(path.join(ROOT, 'db/contact-messages.js'), 'utf8');
    assert.match(src, /async function saveResolution/);
    assert.match(src, /async function archiveMessage/);
    assert.match(src, /async function getSupportAnalytics/);
    assert.match(src, /bugsOverTime/);
    assert.match(src, /getMessageDetail/);
    assert.match(src, /ILIKE/);
    assert.match(src, /async function autoArchiveStaleAnsweredMessages/);
    assert.match(src, /contact-message-events/);
  });

  it('admin routes expose taxonomy, analytics, resolution, archive, events', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/contact-messages.js'), 'utf8');
    assert.match(src, /\/contact-messages\/taxonomy/);
    assert.match(src, /\/contact-messages\/analytics/);
    assert.match(src, /\/contact-messages\/:id\/resolution/);
    assert.match(src, /\/contact-messages\/:id\/archive/);
    assert.match(src, /\/contact-messages\/:id\/events/);
    assert.match(src, /router\.get\('\/contact-messages\/:id'/);
    assert.match(src, /req\.query\.q/);
  });

  it('midnight scheduler auto-archives stale answered messages', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/lib/midnight-scheduler.js'), 'utf8');
    assert.match(src, /autoArchiveStaleAnsweredMessages/);
  });

  it('admin inbox UI supports classification and archive workflow', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-messages-inbox.js'), 'utf8');
    assert.match(src, /saveMessageResolution/);
    assert.match(src, /archiveMessageWithResolution/);
    assert.match(src, /messagesSupportStats/);
    assert.match(src, /loadMessageEvents/);
    assert.match(src, /Klassificera för uppföljning/);
    assert.match(src, /selectArendeTicket/);
    assert.match(src, /arendenListPanel/);
    assert.match(src, /arendenDetailPanel/);
    assert.match(src, /renderTicketTable/);
    assert.match(src, /renderArendenCharts/);
  });

  it('arenden charts module renders bug trend and area charts', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-arenden-charts.js'), 'utf8');
    assert.match(src, /renderArendenCharts/);
    assert.match(src, /arendenBugTrendChart/);
    assert.match(src, /arendenBugAreaChart/);
    assert.match(src, /indexAxis: 'y'/);
  });
});
