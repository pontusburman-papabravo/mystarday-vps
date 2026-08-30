'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('D2 Familj people/access honesty', () => {
  it('GET /api/family does not send inaccessible allChildren', () => {
    const core = read('src/routes/family/core.js');
    assert.match(core, /allChildren: childrenWithPin/);
    assert.match(core, /getChildrenForParent/);
    assert.match(core, /revoked_at IS NULL/);
    assert.doesNotMatch(core, /FROM child WHERE family_id = \$1 ORDER BY sort_order ASC, created_at ASC/);
  });

  it('adult cards never fall back to allChildren and hide edit for non-admins', () => {
    const src = read('public/js/family.js');
    assert.doesNotMatch(src, /allChildren \|\| \[\]/);
    assert.match(src, /familyData\?\.children \|\| \[\]/);
    assert.match(src, /data-access-readonly/);
    assert.match(src, /user && user\.isAdmin/);
    assert.match(src, /data-invite-state="pending"/);
    assert.match(src, /pending\.length > 0/);
  });

  it('pending invites are distinct from active adults', () => {
    const html = read('public/family.html');
    assert.match(html, /pendingInvitesSection/);
    assert.match(html, /familyAdultsSection/);
    const src = read('public/js/family.js');
    assert.match(src, /family\.shell\.waiting/);
  });
});
