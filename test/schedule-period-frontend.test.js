'use strict';

/**
 * Phase 2 — frontend wiring for the "Lovperiod" modal (public/js/schedule-period.js).
 * Source-pattern characterization test, same style as test/schedule-add-menu.test.js.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const MODULE = 'public/js/schedule-period.js';

describe('Phase 2 — schedule-period.js frontend (Lovperiod modal)', () => {
  it('applySchedulePeriod() calls the canonical schedule-periods endpoint, not legacy apply-date-range', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('async function applySchedulePeriod'), src.indexOf('async function removeSchedulePeriod'));
    assert.match(fnBody, /\/schedule-periods`/);
    assert.doesNotMatch(fnBody, /\/apply-date-range/);
  });

  it('applySchedulePeriod() sends name/source/apply_mode and a fresh operation_id', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('async function applySchedulePeriod'), src.indexOf('async function removeSchedulePeriod'));
    assert.match(fnBody, /name:\s*label/);
    assert.match(fnBody, /source:\s*\{\s*type:\s*sourceType,\s*id:\s*sourceId\s*\}/);
    assert.match(fnBody, /apply_mode:\s*'replace_day'/);
    assert.match(fnBody, /ScheduleApplyClient\.newOperationId\(\)/);
  });

  it('removeSchedulePeriod() prefers canonical period-id delete, with a legacy per-date fallback', () => {
    const src = read(MODULE);
    const fnBody = src.slice(src.indexOf('async function removeSchedulePeriod'), src.lastIndexOf('window.openSchedulePeriodModal'));
    assert.match(fnBody, /GET.*schedule-periods|apiFetch\(`\/api\/children\/\$\{currentChildId\}\/schedule-periods`\)/);
    assert.match(fnBody, /method:\s*'DELETE'\s*\}\s*\n\s*\);?\s*\n\s*const delData/s);
    assert.match(fnBody, /special-days\/\$\{dateStr\}/, 'legacy fallback path for periods without a schedule_period row must remain');
  });

  it('legacy apply-date-range backend route is documented as still retained for other callers', () => {
    const src = read(MODULE);
    assert.match(src, /apply-date-range route is retained/);
  });
});
