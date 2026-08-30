'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  ARCHIVE_WINDOW_DAYS,
  shouldArchiveSuccessfulPush,
  isArchiveRowVisible,
  filterArchiveForCurrentAccess,
  publicArchiveRows,
  notificationLoadOutcome,
} = require('../src/lib/notification-archive');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('E2 Notiser 7-day successful-push archive', () => {
  it('archives only successful sends and keeps states distinct', () => {
    assert.equal(ARCHIVE_WINDOW_DAYS, 7);
    assert.equal(shouldArchiveSuccessfulPush(1), true);
    assert.equal(shouldArchiveSuccessfulPush(2), true);
    assert.equal(shouldArchiveSuccessfulPush(0), false);
    assert.equal(shouldArchiveSuccessfulPush(-1), false);
    assert.equal(notificationLoadOutcome(null, 0), 'loading');
    assert.equal(notificationLoadOutcome(false, 0), 'error');
    assert.equal(notificationLoadOutcome(true, 0), 'ok_empty');
    assert.equal(notificationLoadOutcome(true, 3), 'ok_items');
    assert.notEqual(notificationLoadOutcome(false, 0), 'ok_empty');
  });

  it('keeps family-wide rows and hides revoked/inaccessible child rows', () => {
    const familyNews = { id: 'n1', title: 'Nyhet', metadata: {} };
    const linked = { id: 'n2', title: 'Påminnelse', metadata: { child_id: 'child-a' } };
    const revoked = { id: 'n3', title: 'Hemligt', metadata: { child_id: 'child-revoked' } };
    const otherParent = { id: 'n4', title: 'Annan', metadata: { child_id: 'child-b' } };
    const visible = filterArchiveForCurrentAccess(
      [familyNews, linked, revoked, otherParent],
      ['child-a']
    );
    assert.deepEqual(visible.map((row) => row.id), ['n1', 'n2']);
    assert.equal(isArchiveRowVisible(revoked, ['child-a']), false);
    assert.equal(isArchiveRowVisible(familyNews, []), true);
    const publicRows = publicArchiveRows([{ ...linked, body: 'x', type: 'reminder', url: '/', is_read: false, created_at: 'now' }]);
    assert.equal(publicRows[0].title, 'Påminnelse');
    assert.equal('metadata' in publicRows[0], false);
  });

  it('send path logs only when totalSent > 0 and query is 7 days', () => {
    const send = read('src/lib/push-notifications.js');
    assert.match(send, /if \(totalSent > 0\)/);
    assert.match(send, /logNotification\(parentId, \{ title, body, type, url, metadata \}\)/);
    assert.doesNotMatch(send, /logNotification\([\s\S]*\)[\s\S]*if \(totalSent/);
    const db = read('db/notification-log.js');
    assert.match(db, /INTERVAL '7 days'/);
    assert.match(db, /parent_id = \$1/);
    const route = read('src/routes/notification-log.js');
    assert.match(route, /getChildrenForParent/);
    assert.match(route, /filterArchiveForCurrentAccess/);
    assert.match(route, /publicArchiveRows/);
    assert.match(route, /allowedRoles: \['primary', 'shared', 'pedagog'\]/);
  });

  it('Notiser UI is an archive, not an inbox, with distinct states', () => {
    const html = read('public/notifications.html');
    assert.match(html, /data-notiser-state="loading"/);
    assert.match(html, /setNotiserState\('error'\)/);
    assert.match(html, /setNotiserState\('empty'\)/);
    assert.match(html, /setNotiserState\('items'\)/);
    assert.match(html, /Array\.isArray\(notifications\)/);
    assert.match(html, /notiserRetryBtn/);
    assert.match(html, /Lyckade push-notiser de senaste 7 dagarna/);
    assert.match(html, /Inga lyckade push-notiser/);
    assert.match(html, /Misslyckade eller avstängda utskick/);
    assert.doesNotMatch(html, /Hämtar meddelanden/);
    assert.doesNotMatch(html, /när du tar emot dem/);
    assert.doesNotMatch(html, /unified inbox|inkorg/i);
    const settings = read('public/settings.html');
    assert.match(settings, /Lyckade push-notiser de senaste 7 dagarna/);
  });
});
