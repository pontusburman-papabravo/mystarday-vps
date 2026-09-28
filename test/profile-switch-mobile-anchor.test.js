'use strict';

/**
 * Phone-width regression: "Switch profile" stays in the parent header and
 * does not cover the first content block. Notifications/settings are links
 * and the help bubble is a separate bottom sheet — this control is persistent
 * header chrome, not a dialog.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const puppeteer = require('puppeteer');

const PAGES = [
  { path: '/dashboard', pageClass: 'parent-magic-page-dashboard' },
  { path: '/planning', pageClass: 'parent-magic-page-planning' },
  { path: '/rewards', pageClass: 'parent-magic-page-rewards' },
  { path: '/for-dig', pageClass: 'parent-magic-page-for-dig' },
  { path: '/family', pageClass: 'parent-magic-page-family' },
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function pageHtml({ themeClass, pageClass, withHeader }) {
  const header = withHeader
    ? '<div id="parentTopChrome" class="parent-top-chrome">' +
      '<div class="app-view-toggle-wrap"><div class="app-view-toggle">View</div></div>' +
      '<div class="parent-nav-header-actions" data-parent-nav-header="1">' +
      '<a class="parent-hub-icon-btn" data-parent-nav-notifications="1" href="/notifications">N</a>' +
      '<a class="parent-hub-icon-btn" data-parent-nav-settings="1" href="/settings">S</a>' +
      '</div></div>'
    : '';
  return '<!DOCTYPE html><html lang="en-GB"><head>' +
    '<link rel="stylesheet" href="/css/app-view-toggle.css">' +
    '<link rel="stylesheet" href="/css/profile-switch-chrome.css">' +
    '<link rel="stylesheet" href="/css/parent-magic-common.css">' +
    '<style>.parent-hub-icon-btn{width:44px;height:44px;display:inline-flex}</style>' +
    '</head><body class="parent-magic-view ' + themeClass + ' ' + pageClass + '">' +
    '<main>' + header +
    '<section id="firstContent" class="magic-hub-content" data-first-content="1">Get started</section>' +
    '</main>' +
    '<script>try{document.cookie="access_token=test; path=/";' +
    'sessionStorage.setItem("stjarndag_family_device_daily_ux_v1","1");' +
    'sessionStorage.setItem("stjarndag_entry_profile_count","3");}catch(e){}<\/script>' +
    '<script src="/js/nav-config.js"><\/script>' +
    '<script src="/js/profile-switch-chrome.js"><\/script>' +
    '</body></html>';
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0];
      if (url.startsWith('/css/') || url.startsWith('/js/')) {
        const file = path.join(ROOT, 'public', url);
        if (!file.startsWith(path.join(ROOT, 'public'))) {
          res.writeHead(403);
          res.end();
          return;
        }
        try {
          const body = fs.readFileSync(file);
          const type = url.endsWith('.css') ? 'text/css' : 'text/javascript';
          res.writeHead(200, { 'Content-Type': type });
          res.end(body);
          return;
        } catch (_) {
          res.writeHead(404);
          res.end();
          return;
        }
      }
      const q = new URL(req.url, 'http://127.0.0.1');
      const shell = PAGES.find((item) => item.path === q.pathname) || PAGES[1];
      const html = pageHtml({
        themeClass: q.searchParams.get('theme') || '',
        pageClass: shell.pageClass,
        withHeader: q.searchParams.get('header') !== '0',
      });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function measure(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('[data-profile-switch-parent]');
    const content = document.querySelector('[data-first-content]');
    const notes = document.querySelector('[data-parent-nav-notifications]');
    if (!btn || !content) return { missing: true };
    const br = btn.getBoundingClientRect();
    const cr = content.getBoundingClientRect();
    const style = getComputedStyle(btn);
    const overlaps = br.bottom > cr.top + 0.5 && br.right > cr.left + 0.5 && br.left < cr.right - 0.5;
    const chrome = document.querySelector('.parent-top-chrome');
    const chromeRect = chrome ? chrome.getBoundingClientRect() : null;
    return {
      missing: false,
      overlaps,
      btnBottom: br.bottom,
      contentTop: cr.top,
      position: style.position,
      inHeader: !!btn.closest('[data-parent-nav-header]'),
      fallback: btn.classList.contains('profile-switch-parent-fallback'),
      dialogs: document.querySelectorAll('[role="dialog"]').length,
      notesBottom: notes ? notes.getBoundingClientRect().bottom : null,
      chromeBottom: chromeRect ? chromeRect.bottom : null,
    };
  });
}

describe('profile-switch mobile anchor', () => {
  let browser;
  let server;
  let base;

  before(async () => {
    server = await startServer();
    base = 'http://127.0.0.1:' + server.address().port;
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  it('keeps the fallback in document flow and respects the safe area', () => {
    const css = read('public/css/profile-switch-chrome.css');
    const toggle = read('public/css/app-view-toggle.css');
    assert.match(css, /\.profile-switch-parent-fallback[\s\S]*position:\s*relative/);
    assert.match(css, /\.profile-switch-parent-fallback[\s\S]*env\(safe-area-inset-top/);
    assert.doesNotMatch(css, /profile-switch-parent-fallback[\s\S]{0,240}position:\s*fixed/);
    assert.match(toggle, /\.parent-top-chrome[\s\S]*env\(safe-area-inset-top/);
    assert.match(read('public/js/profile-switch-chrome.js'), /anchorParentChromeButton/);
  });

  for (const shell of PAGES) {
    for (const theme of ['', 'parent-theme-light']) {
      for (const width of [390, 430]) {
        const label = shell.path + ' ' + (theme || 'dark') + ' ' + width;
        it('does not cover the first content block at ' + label, async () => {
          const page = await browser.newPage();
          try {
            await page.setViewport({ width, height: 844, isMobile: true, hasTouch: true });
            const themeQ = theme ? '?theme=' + theme : '';
            await page.goto(base + shell.path + themeQ, { waitUntil: 'load' });
            await page.evaluate(() => window.ProfileSwitchChrome.apply());
            const box = await measure(page);
            assert.equal(box.missing, false, 'switch control and first content are present');
            assert.equal(box.inHeader, true);
            assert.equal(box.fallback, false);
            assert.notEqual(box.position, 'fixed');
            assert.equal(box.dialogs, 0);
            assert.equal(box.overlaps, false, JSON.stringify(box));
            assert.ok(box.btnBottom <= box.contentTop + 0.5, JSON.stringify(box));
            if (box.chromeBottom != null) {
              assert.ok(box.chromeBottom <= box.contentTop + 0.5, JSON.stringify(box));
            }
          } finally {
            await page.close();
          }
        });
      }
    }
  }

  it('reparents a body fallback into the header without covering content at 390px', async () => {
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
      await page.goto(base + '/planning?header=0', { waitUntil: 'load' });
      await page.evaluate(() => window.ProfileSwitchChrome.apply());
      const before = await measure(page);
      assert.equal(before.inHeader, false);
      assert.equal(before.fallback, true);
      assert.notEqual(before.position, 'fixed');
      assert.equal(before.overlaps, false, JSON.stringify(before));
      assert.ok(before.btnBottom <= before.contentTop + 0.5, JSON.stringify(before));

      await page.evaluate(() => {
        const main = document.querySelector('main');
        const chrome = document.createElement('div');
        chrome.id = 'parentTopChrome';
        chrome.className = 'parent-top-chrome';
        const bar = document.createElement('div');
        bar.className = 'parent-nav-header-actions';
        bar.setAttribute('data-parent-nav-header', '1');
        const notes = document.createElement('a');
        notes.className = 'parent-hub-icon-btn';
        notes.setAttribute('data-parent-nav-notifications', '1');
        notes.textContent = 'N';
        bar.appendChild(notes);
        chrome.appendChild(bar);
        main.insertBefore(chrome, main.firstChild);
        window.ProfileSwitchChrome.apply();
      });
      const after = await measure(page);
      assert.equal(after.inHeader, true);
      assert.equal(after.fallback, false);
      assert.equal(after.overlaps, false, JSON.stringify(after));
      assert.ok(after.btnBottom <= after.contentTop + 0.5, JSON.stringify(after));
    } finally {
      await page.close();
    }
  });
});
