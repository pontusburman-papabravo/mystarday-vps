'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const STATE_SRC = fs.readFileSync(path.join(ROOT, 'public/js/child-family-state.js'), 'utf8');
const { installChildI18nVm } = require('./helpers/child-i18n-vm');

function loadFamilyState(locale) {
  const context = { window: {}, console };
  installChildI18nVm(context, locale || 'sv-SE');
  vm.runInNewContext(STATE_SRC, context);
  return {
    resolveFamilyState: context.window.resolveFamilyState,
    FAMILY_STATES: context.window.FAMILY_STATES,
    WARM_MOMENT_MS: context.window.WARM_MOMENT_MS,
  };
}

function personsData(overrides) {
  return Object.assign({
    persons: {
      parents: [{ name: 'Mamma', emoji: '👩' }],
      siblings: [{ id: 's1', name: 'Ella', emoji: '🧒' }],
    },
    story: [],
    projects: [],
    chestEnabled: true,
    chest: 12,
  }, overrides || {});
}

describe('resolveFamilyState — exclusive state machine', () => {
  const { resolveFamilyState, FAMILY_STATES } = loadFamilyState();
  const NOW = Date.parse('2026-07-01T12:00:00.000Z');

  it('Growing circle — no persons linked', () => {
    const state = resolveFamilyState({ persons: { parents: [], siblings: [] }, story: [] }, { now: NOW });
    assert.equal(state.state, FAMILY_STATES.GROWING_CIRCLE);
    assert.equal(state.primaryAction, null);
    assert.match(state.statusLine, /hjälper dig/i);
  });

  it('Together — at least one recognizable person', () => {
    const state = resolveFamilyState(personsData(), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.TOGETHER);
    assert.equal(state.personCount, 2);
    assert.equal(state.primaryAction, null);
    assert.ok(state.togetherLine);
  });

  it('Together — single person copy', () => {
    const state = resolveFamilyState(personsData({
      persons: { parents: [{ name: 'Pappa', emoji: '👨' }], siblings: [] },
    }), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.TOGETHER);
    assert.match(state.statusLine, /någon här/i);
  });

  it('Warm moment — recent story within 2s (G-04)', () => {
    const state = resolveFamilyState(personsData({
      story: [{ text: 'Vi läste saga igår', createdAt: '2026-07-01T11:59:59.500Z' }],
    }), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.WARM_MOMENT);
    assert.equal(state.warmText, 'Vi läste saga igår');
    assert.equal(state.primaryAction, null);
  });

  it('Warm moment expires — falls back to Together', () => {
    const state = resolveFamilyState(personsData({
      story: [{ text: 'Gammal stund', createdAt: '2026-07-01T11:59:57.000Z' }],
    }), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.TOGETHER);
  });

  it('Away — calm status, person stays in world (no guilt copy)', () => {
    const state = resolveFamilyState(personsData({
      persons: {
        parents: [
          { name: 'Mamma', emoji: '👩' },
          { name: 'Pappa', emoji: '👨', away: true, awayLabel: 'Hos mamma den här veckan' },
        ],
        siblings: [],
      },
    }), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.AWAY);
    assert.equal(state.statusLine, 'Alla finns kvar här');
    assert.match(state.togetherLine, /Pappa finns kvar här/);
    assert.match(state.awayNote, /Just nu: Hos mamma den här veckan/);
    assert.equal(state.highlightPersonKey, 'parent-1');
    assert.match(state.persons[1].cardNote, /Just nu:/);
  });

  it('Away — blocks guilt phrasing in labels', () => {
    const state = resolveFamilyState(personsData({
      persons: {
        parents: [{ name: 'Pappa', away: true, awayLabel: 'Pappa är borta' }],
        siblings: [],
      },
    }), { now: NOW });
    assert.match(state.persons[0].cardNote, /hos den andra föräldern just nu/i);
    assert.doesNotMatch(state.statusLine, /borta/i);
  });

  it('priority — warm moment beats away', () => {
    const state = resolveFamilyState(personsData({
      persons: {
        parents: [{ name: 'Pappa', away: true, awayLabel: 'Borta' }],
        siblings: [],
      },
      story: [{ text: 'Vi fixade middag', createdAt: '2026-07-01T11:59:59.000Z' }],
    }), { now: NOW });
    assert.equal(state.state, FAMILY_STATES.WARM_MOMENT);
  });

  it('en-GB — away state uses English system copy', () => {
    const { resolveFamilyState: resolveEn, FAMILY_STATES: STATES } = loadFamilyState('en-GB');
    const state = resolveEn(personsData({
      persons: {
        parents: [
          { name: 'Mum', emoji: '👩' },
          { name: 'Dad', emoji: '👨', away: true, awayLabel: 'At mum\'s this week' },
        ],
        siblings: [],
      },
    }), { now: NOW });
    assert.equal(state.state, STATES.AWAY);
    assert.equal(state.statusLine, 'Everyone is still here');
    assert.match(state.togetherLine, /Dad is still here/);
    assert.match(state.awayNote, /Right now: At mum's this week/);
  });
});
