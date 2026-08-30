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
    assert.equal(shouldArchiveSuccessfulPush(null), false);
    assert.equal(shouldArchiveSuccessfulPush(undefined), false);
    assert.equal(shouldArchiveSuccessfulPush('0'), false);
    assert.equal(notificationLoadOutcome(null, 0), 'loading');
    assert.equal(notificationLoadOutcome(false, 0), 'error');
    assert.equal(notificationLoadOutcome(true, 0), 'ok_empty');
    assert.equal(notificationLoadOutcome(true, 3), 'ok_items');
    assert.notEqual(notificationLoadOutcome(false, 0), 'ok_empty');
  });

  it('excludes failed and suppressed sends from the archive helper', () => {
    assert.equal(shouldArchiveSuccessfulPush(0), false, 'failed / no-subscription / suppressed = 0 sent');
    assert.equal(shouldArchiveSuccessfulPush(1), true, 'at least one successful delivery is archived');
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

  it('matches child_id across string forms so revoke cannot fail open', () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const row = { metadata: { child_id: uuid } };
    assert.equal(isArchiveRowVisible(row, [uuid]), true);
    assert.equal(isArchiveRowVisible(row, [` ${uuid} `]), true);
    assert.equal(isArchiveRowVisible(row, []), false);
    assert.equal(isArchiveRowVisible({ metadata: { child_id: 42 } }, ['42']), true);
  });

  it('send path archives only via shouldArchiveSuccessfulPush and query is 7 days', () => {
    const send = read('src/lib/push-notifications.js');
    assert.match(send, /shouldArchiveSuccessfulPush/);
    assert.match(send, /if \(shouldArchiveSuccessfulPush\(totalSent\)\)/);
    assert.match(send, /logNotification\(parentId, \{ title, body, type, url, metadata \}\)/);
    assert.doesNotMatch(send, /if \(totalSent > 0\)/);
    const db = read('db/notification-log.js');
    assert.match(db, /INTERVAL '7 days'/);
    assert.match(db, /parent_id = \$1/);
    const route = read('src/routes/notification-log.js');
    assert.match(route, /getChildrenForParent/);
    assert.match(route, /filterArchiveForCurrentAccess/);
    assert.match(route, /publicArchiveRows/);
    assert.match(route, /allowedRoles: \['primary', 'shared', 'pedagog'\]/);
  });

  it('child-event and child-reminder sends tag metadata.child_id', () => {
    function sliceFn(src, name) {
      const start = src.indexOf(`async function ${name}`);
      assert.ok(start >= 0, name);
      const next = src.indexOf('\nasync function ', start + 1);
      return next === -1 ? src.slice(start) : src.slice(start, next);
    }
    const push = read('src/lib/push.js');
    const sendSrc = sliceFn(push, '_sendParentsPush');
    const starSrc = sliceFn(push, 'notifyChildStarGranted');
    const rewardSrc = sliceFn(push, 'notifyParentsRewardRequest');
    assert.match(sendSrc, /metadata:\s*\{\s*child_id:\s*childId\s*\}/);
    assert.match(starSrc, /metadata:\s*\{\s*child_id:\s*childId\s*\}/);
    assert.match(rewardSrc, /metadata:\s*\{\s*child_id:\s*childId\s*\}/);
    assert.match(sendSrc, /isPushEnabledForChild\(parent, childId\)/);
    assert.match(starSrc, /if \(!isPushEnabled\(parent\)\) return/);
    assert.match(rewardSrc, /isPushEnabledForChild\(parent, childId\)/);

    const reminders = read('src/lib/push-reminder-scheduler.js');
    assert.match(sliceFn(reminders, 'sendInactivityNudges'), /metadata:\s*\{\s*child_id:\s*child\.id\s*\}/);
    assert.match(sliceFn(reminders, 'sendBackfillReminders'), /metadata:\s*\{\s*child_id:\s*child\.id\s*\}/);
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
