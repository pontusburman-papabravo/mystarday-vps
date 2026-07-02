'use strict';

/**
 * H1/N4 — revoked_at must block access on all 12 legacy inline-check endpoints.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const H1_FILES = [
  ['src/routes/schedules/child-crud.js', /authz\.getChildAccess/],
  ['src/routes/schedules/child-bulk.js', /authz\.getChildAccess/],
  ['src/routes/special-day-schedules.js', /authz\.getChildAccess|authz\.getSpecialDayAccess/],
  ['src/routes/onboarding.js', /authz\.getChildAccess/],
  ['src/routes/children.js', /requireChildAccess\('id'\)/],
  ['src/routes/rewards.js', /requireChildAccess\('childId'\)/],
  ['src/routes/family/core.js', /pc\.revoked_at IS NULL/],
  ['src/routes/schedules/items.js', /authz\.getScheduleAccess/],
  ['src/routes/pedagog-invite.js', /verifyPrimaryChildrenForInvite/],
  ['src/routes/family/pedagog.js', /verifyPrimaryChildrenForInvite/],
  ['db/parent-access.js', /getActiveChildAccess/],
  ['src/middleware/authz.js', /getActiveChildAccess/],
];

describe('revoked_at access contract (H1/N4)', () => {
  for (const [file, pattern] of H1_FILES) {
    it(`${file} uses centralized authz with revoked_at`, () => {
      const src = read(file);
      assert.match(src, pattern, `${file} should use centralized helper`);
      if (file.includes('routes/') && !file.includes('family/core')) {
        assert.doesNotMatch(src, /JOIN parent_child pc[\s\S]{0,120}WHERE pc\.parent_id = \$1 AND c\.id = \$2'\s*,/,
          `${file} should not keep raw parent_child access query without revoked_at`);
      }
    });
  }

  it('dangerous childAccess.js middleware is removed', () => {
    assert.equal(
      fs.existsSync(path.join(ROOT, 'src/middleware/childAccess.js')),
      false,
      'childAccess.js must be deleted (H2)'
    );
  });

  it('schedulers index mounts requireChildAccess middleware', () => {
    const src = read('src/routes/schedules/index.js');
    assert.match(src, /requireChildAccess\('childId'\)/);
    assert.match(src, /requireScheduleAccess\('scheduleId'\)/);
  });
});
