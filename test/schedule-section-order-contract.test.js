'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

describe('schedule section ORDER BY uses day order not lexicographic', () => {
  it('weekly schedule items API orders morgon→dag→kvall→natt', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/schedules/items.js'),
      'utf8'
    );
    assert.match(src, /CASE wsi\.section/);
    assert.match(src, /WHEN 'morgon' THEN 0/);
    assert.doesNotMatch(
      src,
      /ORDER BY wsi\.section,\s*wsi\.sort_order/
    );
  });

  it('child weekly-schedule uses section CASE before sort_order', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../src/routes/daily-logs/child-self.js'),
      'utf8'
    );
    assert.match(src, /CASE wsi\.section/);
    assert.match(src, /WHEN 'morgon' THEN 0/);
  });
});
