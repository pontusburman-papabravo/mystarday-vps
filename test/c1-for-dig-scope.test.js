'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  forDigActivationBlock,
  forDigCanClaimAllLinked,
  forDigFilterPreselected,
  forDigInstallsForAccessible,
  forDigApplyListFetch,
} = require('../src/lib/for-dig-scope');

const ROOT = path.join(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('C1 För Dig honest child/family scope', () => {
  it('does not treat a failed children load as an empty family', () => {
    assert.equal(forDigActivationBlock('error'), 'error');
    assert.equal(forDigActivationBlock('ok_empty'), 'empty');
    assert.equal(forDigActivationBlock('ok_items'), null);
    const failed = forDigApplyListFetch([], false, []);
    assert.equal(failed.outcome, 'error');
    assert.deepEqual(failed.items, []);
    const preserved = forDigApplyListFetch([{ id: 'a' }], false, []);
    assert.equal(preserved.outcome, 'ok_items');
    assert.equal(preserved.stale, true);
    assert.equal(preserved.items[0].id, 'a');
  });

  it('never claims all-children when scope or installs are unknown', () => {
    assert.equal(forDigCanClaimAllLinked('error', 'ok_items', 2, 2), false);
    assert.equal(forDigCanClaimAllLinked('ok_items', 'error', 2, 2), false);
    assert.equal(forDigCanClaimAllLinked('ok_items', 'ok_items', 2, 2), true);
    assert.equal(forDigCanClaimAllLinked('ok_items', 'ok_empty', 0, 2), false);
  });

  it('drops inaccessible and revoked children from actionable installs/preselect', () => {
    const installs = [
      { goal_slug: 'g', child_id: 'linked' },
      { goal_slug: 'g', child_id: 'revoked' },
    ];
    assert.deepEqual(
      forDigInstallsForAccessible(installs, ['linked']).map((r) => r.child_id),
      ['linked']
    );
    assert.equal(forDigFilterPreselected('revoked', ['linked']), null);
    assert.equal(forDigFilterPreselected('linked', ['linked']), 'linked');
  });

  it('client loaders and activation honor the scope contract', () => {
    const src = read('public/js/for-dig.js');
    assert.match(src, /childrenOutcome = 'error'/);
    assert.match(src, /installsOutcome = 'error'/);
    assert.match(src, /scopeInstallsToChildren/);
    assert.match(src, /filterPreselectedChild/);
    assert.match(src, /forDig\.activation\.scopeLoadError/);
    assert.match(src, /data-fordig-scope="error"/);
    assert.match(src, /canClaimAllLinkedChildren/);
    assert.doesNotMatch(src, /if \(!res\.ok\) return;\s*children =/);
  });
});
