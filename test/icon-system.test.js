'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function loadIconSystem() {
  const src = fs.readFileSync(path.join(ROOT, 'public/js/icon-system.js'), 'utf8');
  const ctx = { window: {}, console };
  vm.runInNewContext(src, ctx, { filename: 'icon-system.js' });
  return ctx.window.IconSystem;
}

describe('icon-system v4 only', () => {
  it('icon-system.js exposes v4 helpers without v3 fallback', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/icon-system.js'), 'utf8');
    assert.match(src, /window\.IconSystem/);
    assert.match(src, /BASE_V4/);
    assert.match(src, /navigation-active/);
    assert.match(src, /navigation-inactive/);
    assert.match(src, /HUB_V4_KEYS/);
    assert.match(src, /CHROME_V4_KEYS/);
    assert.doesNotMatch(src, /BASE_V3/);
    assert.doesNotMatch(src, /stjarnadag-icons\//);
    assert.match(src, /childFallback/);
  });

  it('nav-config uses icon keys instead of emoji', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /icon: 'hem'/);
    assert.match(src, /icon: 'schema'/);
    assert.match(src, /icon: 'beloningar'/);
    assert.match(src, /icon: 'for-dig'/);
    assert.match(src, /icon: 'familj'/);
    assert.match(src, /icon: 'installningar'/);
    assert.doesNotMatch(src, /icon: '🏠'/);
  });

  it('platform-html injects icon-system before nav-config and loads v4 CSS', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/middleware/platform-html.js'), 'utf8');
    const iconIdx = src.indexOf('icon-system.js');
    const navIdx = src.indexOf('nav-config.js');
    assert.ok(iconIdx > -1 && navIdx > iconIdx);
    assert.match(src, /icon-system\.css/);
    assert.match(src, /stjarnadag-icons-v4\.css/);
  });

  it('v4 nav manifest ships 7 unique keys with active/inactive assets', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/img/stjarnadag-icons-v4/manifest.json'), 'utf8')
    );
    assert.equal(manifest.version, '4.0.0');
    assert.equal(manifest.icons.length, 7);
    for (const entry of manifest.icons) {
      assert.ok(
        fs.existsSync(path.join(ROOT, 'public/img/stjarnadag-icons-v4', entry.path)),
        'missing ' + entry.path
      );
      assert.ok(
        fs.existsSync(
          path.join(ROOT, 'public/img/stjarnadag-icons-v4/navigation-active', entry.key + '.svg')
        ),
        'missing active ' + entry.key
      );
      assert.ok(
        fs.existsSync(
          path.join(ROOT, 'public/img/stjarnadag-icons-v4/navigation-inactive', entry.key + '.svg')
        ),
        'missing inactive ' + entry.key
      );
    }
  });

  it('v4 hub and chrome assets exist for parent surfaces', () => {
    const hubKeys = [
      'kalender', 'historik', 'rapport', 'redigera', 'kopiera-aktivitet', 'pedagog',
      'support', 'profil', 'info', 'barn', 'statistik', 'skattkammaren', 'trofe', 'dag',
    ];
    for (const key of hubKeys) {
      const filePath = path.join(ROOT, 'public/img/stjarnadag-icons-v4/hub', key + '.svg');
      assert.ok(fs.existsSync(filePath), 'missing hub ' + key);
    }
    assert.ok(fs.existsSync(path.join(ROOT, 'public/img/stjarnadag-icons-v4/chrome/tipsa.svg')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/img/stjarnadag-icons-v4/chrome/notiser.svg')));
  });

  it('IconSystem resolves v4 URLs only (nav, chrome, hub, quick actions)', () => {
    const IconSystem = loadIconSystem();
    assert.equal(
      IconSystem.url('hem'),
      '/img/stjarnadag-icons-v4/navigation-inactive/hem.svg'
    );
    assert.equal(
      IconSystem.url('hem', { active: true }),
      '/img/stjarnadag-icons-v4/navigation-active/hem.svg'
    );
    assert.equal(
      IconSystem.url('notiser'),
      '/img/stjarnadag-icons-v4/chrome/notiser.svg'
    );
    assert.equal(
      IconSystem.url('notiser', { active: true }),
      '/img/stjarnadag-icons-v4/chrome/notiser-active.svg'
    );
    assert.equal(
      IconSystem.url('tipsa'),
      '/img/stjarnadag-icons-v4/chrome/tipsa.svg'
    );
    assert.equal(
      IconSystem.url('kalender'),
      '/img/stjarnadag-icons-v4/hub/kalender.svg?v=' + IconSystem.HUB_ASSET_VERSION
    );
    assert.equal(
      IconSystem.url('trofe'),
      '/img/stjarnadag-icons-v4/hub/trofe.svg?v=' + IconSystem.HUB_ASSET_VERSION
    );
    assert.equal(
      IconSystem.url('beloning'),
      '/img/stjarnadag-icons-v4/navigation-inactive/beloningar.svg'
    );
    assert.equal(IconSystem.url('unknown-key'), null);
    assert.equal(IconSystem.SIZES.nav, 28);
    const html = IconSystem.forItem({ icon: 'schema', active: true }, 28, 'app-icon app-icon--nav');
    assert.match(html, /navigation-active\/schema\.svg/);
    assert.match(html, /app-icon--nav-active/);
  });

  it('bottom nav and native tab bar pass active state into IconSystem', () => {
    const shell = fs.readFileSync(path.join(ROOT, 'public/js/parent-magic-shell.js'), 'utf8');
    assert.match(shell, /active:\s*isActive/);
    assert.match(shell, /IconSystem\.forItem\(iconItem,\s*28/);
    const tabs = fs.readFileSync(path.join(ROOT, 'public/js/native-tab-bar.js'), 'utf8');
    assert.match(tabs, /active:\s*active/);
    assert.match(tabs, /IconSystem\.forItem\(Object\.assign\(\{\}, tab, \{ active: active \}\),\s*28/);
  });

  it('mobile sidebar Tipsa uses header chrome icon', () => {
    const mobileNav = fs.readFileSync(path.join(ROOT, 'public/js/mobile-nav.js'), 'utf8');
    assert.match(mobileNav, /IconSystem\.header\('tipsa'\)/);
    assert.doesNotMatch(mobileNav, /IconSystem\.nav\('tipsa'\)/);
  });

  it('quick actions v4 manifest ships four keys with dark assets', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'public/img/stjarnadag-quick-actions-v4/manifest.json'), 'utf8')
    );
    assert.equal(manifest.version, '4.0.0');
    assert.equal(manifest.icons.length, 4);
    for (const entry of manifest.icons) {
      const darkPath = path.join(ROOT, 'public/img/stjarnadag-quick-actions-v4/svg/dark', entry.file);
      const activePath = path.join(ROOT, 'public/img/stjarnadag-quick-actions-v4/svg/dark-active', entry.file);
      assert.ok(fs.existsSync(darkPath), 'missing dark ' + entry.file);
      assert.ok(fs.existsSync(activePath), 'missing dark-active ' + entry.file);
    }
  });

  it('IconSystem resolves v4 quick-action URLs on dark Hem cards', () => {
    const IconSystem = loadIconSystem();
    assert.equal(
      IconSystem.url('registrera-i-efterhand'),
      '/img/stjarnadag-quick-actions-v4/svg/dark/i-efterhand.svg'
    );
    assert.equal(
      IconSystem.url('ledig-dag', { active: true }),
      '/img/stjarnadag-quick-actions-v4/svg/dark-active/ledig-dag.svg'
    );
    assert.equal(IconSystem.SIZES.quickAction, 48);
    const html = IconSystem.quickAction('engangsaktivitet');
    assert.match(html, /app-icon--quick-action/);
    assert.match(html, /engangsaktivitet\.svg/);
    assert.match(html, /width="48"/);
  });

  it('chrome notiser SVGs use dark strokes for white header tiles', () => {
    const inactive = fs.readFileSync(
      path.join(ROOT, 'public/img/stjarnadag-icons-v4/chrome/notiser.svg'),
      'utf8'
    );
    const active = fs.readFileSync(
      path.join(ROOT, 'public/img/stjarnadag-icons-v4/chrome/notiser-active.svg'),
      'utf8'
    );
    assert.match(inactive, /#1B2340/);
    assert.doesNotMatch(inactive, /#F7F2E8/);
    assert.match(active, /#1B2340/);
    assert.doesNotMatch(active, /#F7F2E8/);
  });

  it('child fallback resolves v4 child assets', () => {
    const IconSystem = loadIconSystem();
    const html = IconSystem.childFallback('today');
    assert.match(html, /child\/min-dag\.svg/);
    assert.equal(IconSystem.url('child-skattkammaren'), '/img/stjarnadag-icons-v4/child/skattkammaren.svg');
  });
});
