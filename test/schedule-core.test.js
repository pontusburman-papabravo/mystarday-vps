const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('F1 schedule-core.js', () => {
  it('exports ScheduleCore with allowed shared symbols', () => {
    const src = read('public/js/schedule-core.js');
    assert.match(src, /window\.ScheduleCore\s*=\s*\{/);
    assert.match(src, /DAYS,/);
    assert.match(src, /DAYS_SHORT,/);
    assert.match(src, /SECTIONS,/);
    assert.match(src, /updateBirthdayHidden,/);
    assert.match(src, /buildSectionCardsHtml,/);
    assert.match(src, /getDayDateLabel,/);
    assert.match(src, /sectionTimeLabel,/);
    assert.match(src, /fmtTime,/);
    assert.match(src, /window\.updateBirthdayHidden\s*=\s*updateBirthdayHidden/);
  });

  it('dashboard.html loads schedule-core before dashboard.js', () => {
    const html = read('public/dashboard.html');
    const coreIdx = html.indexOf('/js/schedule-core.js');
    const dashIdx = html.indexOf('/js/dashboard.js');
    assert.ok(coreIdx !== -1, 'schedule-core.js script tag missing');
    assert.ok(dashIdx !== -1, 'dashboard.js script tag missing');
    assert.ok(coreIdx < dashIdx, 'schedule-core must load before dashboard.js');
  });

  it('schedule.html loads schedule-core before schedule.js', () => {
    const html = read('public/schedule.html');
    const coreIdx = html.indexOf('/js/schedule-core.js');
    const schedIdx = html.indexOf('/js/schedule.js');
    assert.ok(coreIdx !== -1, 'schedule-core.js script tag missing');
    assert.ok(schedIdx !== -1, 'schedule.js script tag missing');
    assert.ok(coreIdx < schedIdx, 'schedule-core must load before schedule.js');
  });

  it('dashboard.js and schedule.js consume ScheduleCore instead of duplicating constants', () => {
    for (const file of ['public/js/dashboard.js', 'public/js/schedule.js']) {
      const src = read(file);
      assert.match(src, /window\.ScheduleCore/, `${file} must import from ScheduleCore`);
      assert.doesNotMatch(src, /const DAYS = \['Söndag'/, `${file} must not redefine DAYS`);
      assert.doesNotMatch(src, /function updateBirthdayHidden\(/, `${file} must not redefine updateBirthdayHidden`);
      assert.match(src, /buildSectionCardsHtml\(scheduleItems,\s*renderItem\)/, `${file} must use shared section renderer`);
    }
  });

  it('buildSectionCardsHtml preserves section-card DOM contract', () => {
    const src = read('public/js/schedule-core.js');
    assert.match(src, /section-card border-2/);
    assert.match(src, /items-list/);
    assert.match(src, /openAddModal\('\$\{sec\.key\}'\)/);
    assert.match(src, /Inga aktiviteter/);
  });
});
