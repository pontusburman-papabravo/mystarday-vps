'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('reports nav client gating (feature vs component)', () => {
  it('dashboard reports link is tagged with reporting component', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/dashboard.html'), 'utf8');
    assert.match(html, /href="\/reports"[^>]*data-component="reporting"/);
    assert.match(html, /id="activeSharingBanner"[^>]*data-component="reporting"/);
  });

  it('feature-check applies package reporting gate', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/feature-check.js'), 'utf8');
    assert.match(src, /data-component="reporting"/);
    assert.match(src, /fetchPackageAccess|subscription\/access/);
    assert.match(src, /applyReportingComponentGate/);
  });

  it('NavConfig reports capability uses reporting feature slug', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/nav-config.js'), 'utf8');
    assert.match(src, /id: 'reports'[\s\S]*feature: 'reporting'/);
  });
});
