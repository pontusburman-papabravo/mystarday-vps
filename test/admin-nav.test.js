const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function loadAdminNav() {
  const src = fs.readFileSync(path.join(ROOT, 'public/admin/admin-nav.js'), 'utf8');
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx.window;
}

test('admin-nav defines six top-level groups', () => {
  const nav = loadAdminNav();
  assert.equal(nav.ADMIN_NAV.length, 6);
  const labels = nav.ADMIN_NAV.map((g) => g.label);
  assert.equal(labels.join('|'), 'Hem|Tillväxt|Kommunikation|Insikter|Innehåll|Inställningar');
});

test('resolveRoute maps legacy hashes to new navigation context', () => {
  const { resolveRoute } = loadAdminNav();

  const start = resolveRoute('#overview');
  assert.equal(start.navId, 'start');
  assert.equal(start.actualSection, 'overview');
  assert.equal(start.pageTitle, 'Start');
  assert.equal(start.breadcrumb.join(' › '), 'Hem › Start');

  const paket = resolveRoute('#paketintresse');
  assert.equal(paket.navId, 'paketintresse');
  assert.equal(paket.actualSection, 'prenumeration');
  assert.equal(paket.scrollTarget, '#paketintresse-anchor');
  assert.equal(paket.breadcrumb.join(' › '), 'Tillväxt › Paketintresse');

  const valkomst = resolveRoute('#valkomstmail');
  assert.equal(valkomst.navId, 'emailmallar');
  assert.equal(valkomst.actualSection, 'emailmallar');
  assert.equal(valkomst.emailTab, 'valkomstmail');
  assert.equal(valkomst.hash, '#valkomstmail');

  const pedagog = resolveRoute('#intresseanmalningar');
  assert.equal(pedagog.navId, 'pedagogintresse');
  assert.equal(pedagog.pageTitle, 'Pedagogintresse');

  const produkt = resolveRoute('#analytics');
  assert.equal(produkt.navId, 'produktanalys');
  assert.equal(produkt.pageTitle, 'Produktanalys');

  const insights = resolveRoute('#anvandarstatistik');
  assert.equal(insights.navId, 'anvandarinsikter');
  assert.equal(insights.breadcrumb.join(' › '), 'Insikter › Produktanalys › Användarinsikter');

  const bildbank = resolveRoute('#bildbank');
  assert.equal(bildbank.navId, 'bildbank');
  assert.equal(bildbank.breadcrumb.join(' › '), 'Tillväxt › Landningssidor › Bildbank');
});

test('index.html wires grouped navigation and breadcrumb', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');
  assert.match(html, /admin-nav\.js/);
  assert.match(html, /id="adminBreadcrumb"/);
  assert.match(html, /id="paketintresse-anchor"/);
  assert.match(html, /id="adminSidebarLinks"/);
  assert.doesNotMatch(html, /Översikt<\/a>/);
});
