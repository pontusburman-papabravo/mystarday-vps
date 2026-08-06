'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  contractError,
  sanitizeMe,
} = require('../scripts/ops/founder-smoke-child-today-wait-contract.cjs');
const {
  prepareSc4ServerState,
  prepareSc2ServerState,
  prepareSc3ServerState,
} = require('../scripts/ops/founder-smoke-browser-child-locale-scenario.cjs');

describe('founder smoke child locale context', () => {
  it('sanitizeMe omits secrets and keeps locale fields', () => {
    const s = sanitizeMe({
      type: 'child',
      child_ui_locale: 'sv-SE',
      english_child_experience_enabled: false,
      username: 'astridqa',
      family_id: 'uuid',
      pin: '1234',
      password: 'secret',
    });
    assert.equal(s.child_ui_locale, 'sv-SE');
    assert.equal(s.pin, undefined);
    assert.equal(s.password, undefined);
  });

  it('contractError uses CHILD_LOCALE_CONTRACT_NOT_APPLIED', () => {
    const err = contractError('auth_me_child_locale', {
      expected_locale: 'sv-SE',
      actual_locale: 'en-GB',
    });
    assert.equal(err.code, 'CHILD_LOCALE_CONTRACT_NOT_APPLIED');
    assert.equal(err.diagnostics.failed_step, 'auth_me_child_locale');
    assert.equal(err.diagnostics.expected_locale, 'sv-SE');
    assert.equal(err.diagnostics.actual_locale, 'en-GB');
  });

  it('prepareSc4 establishes sv-SE control before sc4 assertions', () => {
    const calls = [];
    const vpsDb = (cmd, fid, extra) => {
      calls.push({ cmd, fid, extra });
      return { ok: true };
    };
    prepareSc4ServerState(vpsDb, 'family-1');
    assert.ok(calls.some((c) => c.cmd === 'set-locale' && c.extra?.includes('sv-SE')));
    assert.ok(
      calls.some(
        (c) => c.cmd === 'set' && c.extra?.includes('english_child_experience') && c.extra?.includes('--off')
      )
    );
  });

  it('prepareSc2 and prepareSc3 call vpsDb with distinct child flag', () => {
    const calls = [];
    const vpsDb = (cmd, fid, extra) => {
      calls.push({ cmd, fid, extra });
      return { ok: true };
    };
    const fid = 'family-1';
    prepareSc2ServerState(vpsDb, fid);
    prepareSc3ServerState(vpsDb, fid);
    const sc2On = calls.find((c) => c.extra?.includes('--on') && c.extra?.includes('english_child_experience'));
    const sc3Off = calls.filter((c) => c.extra?.includes('english_child_experience'));
    assert.ok(calls.some((c) => c.cmd === 'set-locale'));
    assert.ok(sc2On);
    assert.ok(sc3Off.some((c) => c.extra?.includes('--off')));
  });
});
