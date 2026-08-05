'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateChildTodaySessionPass,
  computeBrowserPass,
  looksLikeChildLoginScreenText,
} = require('../scripts/ops/founder-smoke-browser-child.cjs');

describe('founder smoke browser child', () => {
  it('rejects /child-login pathname even with English login copy', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child-login',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'en-GB' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      todayBodyText: 'Who are you?\nLog in as a child',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'not_on_child_today');
  });

  it('rejects English login screen text without Today on apparent child path', () => {
    assert.equal(
      looksLikeChildLoginScreenText('Who are you?\nPick your profile'),
      true
    );
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'en-GB' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      todayBodyText: 'Who are you?\nLog in as a child',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'login_screen_text');
  });

  it('rejects wrong PIN / missing child session', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: null,
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      todayBodyText: 'Today\nActivities',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'me_not_child');
  });

  it('accepts authenticated en-GB child on Today', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'astrid921', child_ui_locale: 'en-GB' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'en-GB',
      todayBodyText: 'Today\nMorning',
    });
    assert.equal(r.pass, true);
  });

  it('computeBrowserPass fails when restore does not match', () => {
    const bits = computeBrowserPass({
      scenarios: { a: { pass: true } },
      restoreMeta: { restored: true, restore_matches_snapshot: false },
      vpsOn: true,
    });
    assert.equal(bits.scenariosPass, true);
    assert.equal(bits.restorePass, false);
    assert.equal(bits.pass, false);
  });
});
