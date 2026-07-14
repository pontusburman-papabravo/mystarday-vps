'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

describe('admin overview — child self checkoffs', () => {
  it('overview-stats returns child_self unique + completions', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src/routes/admin/system.js'), 'utf8');
    assert.match(src, /child_self_completions/);
    assert.match(src, /child_self_unique/);
    assert.match(src, /completed_by = 'child'/);
    assert.match(src, /child_self:\s*\{/);
    assert.match(src, /unique_children: activityCounts\.rows\[0\]\.child_self_unique/);
    assert.match(src, /self_completions/);
  });

  it('admin overview UI shows child self metrics', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/admin/index.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'public/admin/admin-library.js'), 'utf8');
    assert.match(html, /overviewChildSelfUnique/);
    assert.match(html, /overviewChildSelfCompletions/);
    assert.match(html, /UNIKA BARN SOM BOCKADE SJÄLVA/);
    assert.match(js, /activity\?\.child_self\?\.unique_children/);
    assert.match(js, /activity\?\.child_self\?\.completions/);
    assert.match(js, /self_completions/);
    assert.match(js, /Varav själv/);
  });
});
