'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function loadChildAchievementI18n(tFn) {
  const src = read('public/js/child-achievement-i18n.js');
  const sandbox = {
    window: {},
    childT: tFn,
    cpt: tFn,
  };
  sandbox.window.childT = tFn;
  sandbox.window.cpt = tFn;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'child-achievement-i18n.js' });
  return sandbox.window.ChildAchievementI18n;
}

describe('i18n child UI leaks — static wiring', () => {
  it('child-customization-entries uses locale for picture style', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /t\('settings\.imageStyle'\)/);
    assert.doesNotMatch(src, /Bildstil/);
    assert.doesNotMatch(src, /Tydliga bilder/);
  });

  it('child-pictogram-packs client uses labelKey, not hardcoded pack labels', () => {
    const src = read('public/js/child-pictogram-packs.js');
    assert.match(src, /labelKey: 'settings\.pictogramPackSimple'/);
    assert.match(src, /labelKey: 'settings\.pictogramPackAction'/);
    assert.match(src, /function packLabel/);
    assert.doesNotMatch(src, /label: 'Tydliga bilder'/);
    assert.doesNotMatch(src, /label: 'Aktiva bilder'/);
  });

  it('child-dashboard.html wires scheduleChrome.otherDays', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /data-i18n="child\.scheduleChrome\.otherDays"/);
    assert.doesNotMatch(html, /<summary class="child-week-summary">📅 Andra dagar<\/summary>/);
  });

  it('child-dashboard-photo-cards uses substepsLabel from locale', () => {
    const src = read('public/js/child-dashboard-photo-cards.js');
    assert.match(src, /t\('steps\.substepsLabel'\)/);
    assert.doesNotMatch(src, /Delsteg/);
    assert.match(src, /activityTitle\(item\)/);
    assert.match(src, /display_name/);
  });

  it('photo activity cards do not clip expanded sub-steps', () => {
    const html = read('public/child-dashboard.html');
    assert.match(html, /\.photo-activity-card\s*\{[^}]*overflow:\s*visible/s);
    assert.match(html, /\.photo-activity-card__meta \.substep-progress/);
  });

  it('substeps module times out hung fetches and focus bar uses display_name', () => {
    const sub = read('public/js/child-dashboard-substeps.js');
    assert.match(sub, /SUBSTEPS_FETCH_TIMEOUT_MS/);
    assert.match(sub, /steps\.loadFailed/);
    const focus = read('public/js/child-today-focus.js');
    assert.match(focus, /function activityLabel/);
    assert.match(focus, /activityLabel\(nextItem\)/);
  });

  it('child-dashboard loads achievement i18n helper before trophy views', () => {
    const html = read('public/child-dashboard.html');
    const achIdx = html.indexOf('child-achievement-i18n.js');
    const samlingIdx = html.indexOf('child-samling-present.js');
    assert.ok(achIdx > 0, 'child-achievement-i18n.js script missing');
    assert.ok(achIdx < samlingIdx, 'achievement i18n must load before samling-present');
  });
});

describe('ChildAchievementI18n — trophy slug lookup', () => {
  const i18n = require('../src/lib/i18n');
  i18n.loadLocales();

  function childT(key) {
    return i18n.t('en-GB', 'child.' + key);
  }

  function childTSv(key) {
    return i18n.t('sv-SE', 'child.' + key);
  }

  it('renders known trophy keys in English', () => {
    const mod = loadChildAchievementI18n(childT);
    assert.equal(
      mod.resolveName({ slug: 'first_week', name: 'Första veckan' }),
      'First week'
    );
    assert.equal(
      mod.resolveName({ slug: 'reward_fan', name: 'Belöningsfantast' }),
      'Reward fan'
    );
    assert.match(
      mod.resolveDescription({ slug: 'first_week', description: 'Sju dagar i rad med aktivitet!' }),
      /Seven days/i
    );
  });

  it('renders known trophy keys in Swedish', () => {
    const mod = loadChildAchievementI18n(childTSv);
    assert.equal(
      mod.resolveName({ slug: 'first_week', name: 'DB fallback' }),
      'Första veckan'
    );
    assert.equal(
      mod.resolveName({ slug: 'reward_fan', name: 'DB fallback' }),
      'Belöningsfantast'
    );
  });

  it('falls back to DB name for unknown or legacy slug', () => {
    const mod = loadChildAchievementI18n(childT);
    assert.equal(
      mod.resolveName({ slug: 'legacy_custom_trophy', name: 'Custom trophy' }),
      'Custom trophy'
    );
    assert.equal(
      mod.resolveDescription({ slug: 'legacy_custom_trophy', description: 'Legacy desc' }),
      'Legacy desc'
    );
  });

  it('child-samling-present uses ChildAchievementI18n for trophy display', () => {
    const src = read('public/js/child-samling-present.js');
    assert.match(src, /ChildAchievementI18n\.resolveName/);
    assert.match(src, /ChildAchievementI18n\.resolveDescription/);
  });
});

describe('i18n child UI leaks — title/aria locale', () => {
  it('customization pictogram entry aria follows settings.imageStyle', () => {
    const src = read('public/js/child-customization-entries.js');
    assert.match(src, /aria-label="' \+ esc\(t\('settings\.imageStyle'\)\)/);
    assert.doesNotMatch(src, /aria-label="Bildstil"/);
  });

  it('locale bundles include pictogram pack labels', () => {
    const i18n = require('../src/lib/i18n');
    i18n.loadLocales();
    assert.equal(i18n.t('en-GB', 'child.settings.pictogramPackSimple'), 'Clear pictures');
    assert.equal(i18n.t('sv-SE', 'child.settings.pictogramPackSimple'), 'Tydliga bilder');
  });
});
