'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const REMOVED = [
  'public/js/samarbete-hub.js',
  'public/admin/admin-interests.js',
  'public/js/landing-newsletter.js',
  'public/js/landing-survey-popup.js',
  'public/js/landing-program-matrix.js',
  'public/js/program-catalog-render.js',
  'public/js/pricing-info.js',
  'public/js/child-package-nav.js',
  'public/css/program-catalog.css',
];

const KEPT = ['public/js/iap-manager.js'];

test('Fas 11 — Tier A dead code files removed', () => {
  for (const rel of REMOVED) {
    assert.ok(!fs.existsSync(path.join(ROOT, rel)), `expected removed: ${rel}`);
  }
});

test('Fas 11 — iap-manager stub retained for future IAP', () => {
  for (const rel of KEPT) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `expected kept: ${rel}`);
  }
});

test('Fas 11 — no HTML script tags for removed client modules', () => {
  const htmlDir = path.join(ROOT, 'public');
  const names = REMOVED.map((p) => path.basename(p));
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory() && ent.name !== 'node_modules') walk(full);
      else if (ent.isFile() && ent.name.endsWith('.html')) {
        const html = fs.readFileSync(full, 'utf8');
        for (const name of names) {
          assert.doesNotMatch(html, new RegExp(name.replace('.', '\\.')));
        }
      }
    }
  };
  walk(htmlDir);
  const adminHtml = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');
  for (const name of names) {
    assert.doesNotMatch(adminHtml, new RegExp(name.replace('.', '\\.')));
  }
});
