'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('path');
const express = require('express');
const { buildAppleAppSiteAssociation } = require('../src/lib/well-known');
const { openChildEntryUrl, OPEN_CHILD_ENTRY_PATH } = require('../src/lib/open-child-entry');
const { renderOpenChildPage } = require('../src/routes/open-child');

const ROOT = path.join(__dirname, '..');

describe('open-child semantic entry', () => {
  it('exports /open/child path and URL builder', () => {
    const prev = process.env.APP_URL;
    process.env.APP_URL = 'https://example.test'; // pragma: allowlist secret
    try {
      assert.equal(OPEN_CHILD_ENTRY_PATH, '/open/child');
      assert.equal(openChildEntryUrl(), 'https://example.test/open/child');
    } finally {
      if (prev === undefined) delete process.env.APP_URL;
      else process.env.APP_URL = prev;
    }
  });

  it('GET /open/child returns web fallback HTML with store links', async () => {
    const app = express();
    app.use('/', require('../src/routes/open-child'));
    await new Promise((resolve, reject) => {
      const server = app.listen(0, async () => {
        try {
          const port = server.address().port;
          const res = await fetch(`http://127.0.0.1:${port}/open/child`);
          assert.equal(res.status, 200);
          const html = await res.text();
          assert.match(html, /Fortsätt i webbläsaren/);
          assert.match(html, /apps\.apple\.com\/app\/id|apple\.co\//);
          assert.match(html, /play\.google\.com/);
          assert.match(html, /open-child-entry\.js/);
          assert.match(html, /app-entry-orchestrator\.js/);
          server.close(resolve);
        } catch (err) {
          server.close(() => reject(err));
        }
      });
    });
  });

  it('fallback page delegates to orchestrator, not legacy PIN copy', () => {
    const js = fs.readFileSync(path.join(ROOT, 'public/js/open-child-entry.js'), 'utf8');
    assert.match(js, /redirectAuthoritativeEntryOrLegacy/);
    assert.match(js, /TrustedDeviceBootstrap\.tryColdStart/);
    assert.doesNotMatch(js, /child-login/);
  });

  it('app-entry-orchestrator defers session gate on /open/child', () => {
    const orch = fs.readFileSync(path.join(ROOT, 'public/js/app-entry-orchestrator.js'), 'utf8');
    assert.match(orch, /\/open\/child/);
  });

  it('AASA includes /open/child for iOS Universal Links', () => {
    const aasa = buildAppleAppSiteAssociation();
    const paths = aasa.applinks.details[0].paths;
    assert.ok(paths.some((p) => p.includes('/open/child')));
  });

  it('route is mounted before static middleware', () => {
    const routes = fs.readFileSync(path.join(ROOT, 'src/routes/index.js'), 'utf8');
    const openIdx = routes.indexOf("require('./open-child')");
    const staticIdx = routes.indexOf("require('./static-routes')");
    assert.ok(openIdx > -1);
    assert.ok(staticIdx > openIdx);
  });

  it('renderOpenChildPage injects both store URLs', () => {
    const html = renderOpenChildPage();
    assert.doesNotMatch(html, /__APPLE_STORE_URL__/);
    assert.doesNotMatch(html, /__PLAY_STORE_URL__/);
    assert.match(html, /apps\.apple\.com\/app\/id|apple\.co\//);
    assert.match(html, /play\.google\.com/);
  });
});
