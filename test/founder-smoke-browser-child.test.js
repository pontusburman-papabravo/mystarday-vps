'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateChildTodaySessionPass,
  evaluateParentHandoffRestorePass,
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
      mainText: 'Mission\nNow\nNext',
      navText: 'Treasure Chest',
      childTodayI18nReady: true,
      htmlLang: 'en-GB',
    });
    assert.equal(r.pass, true);
  });

  it('PASS when expected and actual username both astrid921 (case-insensitive)', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: {
        type: 'child',
        username: 'astrid921',
        child_ui_locale: 'sv-SE',
        family_id: 'fam-test',
      },
      expectedUsername: 'Astrid921',
      expectedChildUiLocale: 'sv-SE',
      todayBodyText: 'Idag\nMorgon',
    });
    assert.equal(r.pass, true);
  });

  it('wrong_child includes expected_username and actual_username', () => {
    const r = evaluateChildTodaySessionPass({
      pathname: '/child/today',
      me: { type: 'child', username: 'otherkid', child_ui_locale: 'sv-SE' },
      expectedUsername: 'astrid921',
      expectedChildUiLocale: 'sv-SE',
      todayBodyText: 'Idag\nMorgon',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'wrong_child');
    assert.equal(r.expected_username, 'astrid921');
    assert.equal(r.actual_username, 'otherkid');
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

  it('evaluateParentHandoffRestorePass rejects wrong parent email', () => {
    const r = evaluateParentHandoffRestorePass({
      me: { type: 'parent', email: 'other@example.com', family_id: 'fam-1' },
      path: '/dashboard',
      onLoginForm: false,
      expectedEmail: 'founder@example.com',
      expectedFamilyId: 'fam-1',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'wrong_parent_email');
  });

  it('evaluateParentHandoffRestorePass rejects wrong family_id', () => {
    const r = evaluateParentHandoffRestorePass({
      me: { type: 'parent', email: 'founder@example.com', family_id: 'fam-other' },
      path: '/dashboard',
      onLoginForm: false,
      expectedEmail: 'founder@example.com',
      expectedFamilyId: 'fam-1',
    });
    assert.equal(r.pass, false);
    assert.equal(r.reason, 'wrong_family_id');
  });

  it('evaluateParentHandoffRestorePass accepts matching founder parent', () => {
    const r = evaluateParentHandoffRestorePass({
      me: { type: 'parent', email: 'Founder@Example.com', family_id: 'fam-1', preferred_locale: 'en-GB' },
      path: '/dashboard',
      onLoginForm: false,
      expectedEmail: 'founder@example.com',
      expectedFamilyId: 'fam-1',
    });
    assert.equal(r.pass, true);
  });
});
