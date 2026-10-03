'use strict';

/**
 * Weekly schedule mobile day list.
 * The selected day is a section list. + Aktivitet inside the section is the
 * add path. Day-level secondary actions live in one solid ⋯ sheet.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadDaySheet(matches) {
  const byId = new Map();
  function makeEl(tag, id) {
    const el = {
      tagName: tag,
      className: '',
      attributes: {},
      _html: '',
      classList: null,
    };
    el._id = id || '';
    Object.defineProperty(el, 'id', {
      get() { return el._id; },
      set(value) {
        if (el._id && byId.get(el._id) === el) byId.delete(el._id);
        el._id = value || '';
        if (el._id) byId.set(el._id, el);
      },
    });
    el.classList = {
      add(name) {
        const parts = new Set(el.className.split(/\s+/).filter(Boolean));
        parts.add(name);
        el.className = [...parts].join(' ');
      },
      remove(name) {
        el.className = el.className.split(/\s+/).filter((part) => part && part !== name).join(' ');
      },
      contains(name) {
        return el.className.split(/\s+/).includes(name);
      },
    };
    el.setAttribute = (key, value) => { el.attributes[key] = String(value); };
    el.getAttribute = (key) => (Object.prototype.hasOwnProperty.call(el.attributes, key) ? el.attributes[key] : null);
    el.addEventListener = () => {};
    el.appendChild = () => {};
    Object.defineProperty(el, 'innerHTML', {
      get() { return el._html; },
      set(html) {
        el._html = String(html);
        for (const match of String(html).matchAll(/id="([^"]+)"/g)) {
          if (!byId.has(match[1])) byId.set(match[1], makeEl('div', match[1]));
        }
      },
    });
    if (id) byId.set(id, el);
    return el;
  }

  const body = makeEl('body');
  const document = {
    body,
    getElementById: (id) => byId.get(id) || null,
    createElement: (tag) => makeEl(tag),
    addEventListener() {},
  };
  const sandbox = {
    document,
    matchMedia() {
      return { matches: Boolean(matches), addEventListener() {} };
    },
    currentDay: 5,
    dayName: (dow) => (dow === 5 ? 'Fredag' : String(dow)),
    ScheduleAddMenu: {
      opened: [],
      openCopyDay() { this.opened.push('copy-day'); },
      openSaveAsTemplate() { this.opened.push('save-template'); },
    },
    openCopyWeeksModal() { sandbox.opened.push('copy-weeks'); },
    openCopyChildModal() { sandbox.opened.push('copy-child'); },
    confirmDeleteSchedule() { sandbox.opened.push('delete-day'); },
    opened: [],
  };
  sandbox.window = sandbox;
  vm.runInNewContext(read('public/js/schedule-day-sheet.js'), sandbox, { filename: 'schedule-day-sheet.js' });
  return { sandbox, document };
}

describe('schedule mobile day list', () => {
  it('hides the day-tab plus and drag handle at the mobile breakpoint', () => {
    const mobile = loadDaySheet(true);
    const desktop = loadDaySheet(false);
    const mobileChrome = mobile.sandbox.ScheduleDaySheet.mobileDayChrome();
    assert.equal(mobileChrome.draggable, '');
    assert.equal(mobileChrome.showDayAdd, false);
    assert.equal(desktop.sandbox.ScheduleDaySheet.mobileDayChrome().draggable, 'draggable="true"');
    assert.equal(desktop.sandbox.ScheduleDaySheet.mobileDayChrome().showDayAdd, true);
    const tabs = read('public/js/schedule.js').slice(
      read('public/js/schedule.js').indexOf('function renderDayTabs'),
      read('public/js/schedule.js').indexOf('function clearDayTabHighlights'),
    );
    assert.match(tabs, /ScheduleDaySheet\.mobileDayChrome\(\)/);
    assert.match(tabs, /\$\{dayChrome\.draggable\}/);
    assert.match(tabs, /dayChrome\.showDayAdd/);
    assert.match(tabs, /if \(!dayChrome\.draggable\)/);
    assert.match(read('public/schedule.html'), /@media \(max-width: 767px\)[\s\S]*\.insert-day-btn \{ display: none; \}/);
  });

  it('puts exactly one + Aktivitet on each section', () => {
    const sandbox = {
      sectionTimes: null,
      ScheduleI18n: { t: (key) => key },
    };
    sandbox.window = sandbox;
    vm.runInNewContext(read('public/js/schedule-core.js'), sandbox, { filename: 'schedule-core.js' });
    const html = sandbox.ScheduleCore.buildSectionCardsHtml([
      { id: 'a', section: 'morgon', sort_order: 1, activity_name: 'Borsta tänderna efter frukost' },
    ], (item) => `<p class="schedule-activity-name">${item.activity_name}</p>`);
    assert.equal((html.match(/data-section-add="activity"/g) || []).length, sandbox.ScheduleCore.SECTIONS.length);
    assert.equal((html.match(/openAddModal\(/g) || []).length, sandbox.ScheduleCore.SECTIONS.length);
    assert.match(html, /Borsta tänderna efter frukost/);
    assert.doesNotMatch(html, /schedule-activity-name[^<]*\.\.\./);
  });

  it('lets an ordinary activity name wrap at 390px instead of truncating it', () => {
    const src = read('public/js/schedule.js');
    const renderItem = src.slice(src.indexOf('function renderItem'), src.indexOf('function toggleScheduleSubSteps'));
    assert.match(renderItem, /class="schedule-activity-name/);
    assert.doesNotMatch(renderItem, /class="schedule-activity-name[^"]*truncate/);
    assert.match(renderItem, /schedule-activity-meta/);
    assert.match(renderItem, /schedule-row-inline-remove/);
    assert.match(renderItem, /overflow-menu-popup schedule-menu-surface/);
    const page = read('public/schedule.html');
    const narrow = page.slice(page.indexOf('@media (max-width: 390px)'), page.indexOf('@media (max-width: 390px)') + 280);
    assert.match(narrow, /\.schedule-activity-name/);
    assert.match(narrow, /white-space:\s*normal/);
    assert.match(narrow, /text-overflow:\s*unset/);
    assert.doesNotMatch(narrow, /ellipsis/);
    assert.match(page, /@media \(max-width: 767px\)[\s\S]*\.schedule-row-inline-remove \{ display: none; \}/);
  });

  it('opens one solid day sheet from ⋯ and does not add a z-index scale', () => {
    const { sandbox, document } = loadDaySheet(true);
    sandbox.ScheduleDaySheet.open();
    const sheet = document.getElementById('scheduleDaySheet');
    assert.equal(sheet.getAttribute('data-overlay'), 'modal');
    assert.equal(sheet.getAttribute('role'), 'dialog');
    assert.equal(sheet.classList.contains('hidden'), false);
    assert.match(sheet.innerHTML, /schedule-menu-surface/);
    assert.match(sheet.innerHTML, /id="scheduleDaySheetPanel"/);
    assert.doesNotMatch(sheet.innerHTML, /bg-white/);
    assert.doesNotMatch(sheet.innerHTML, /z-\[|z-index/);
    const actions = document.getElementById('scheduleDaySheetActions').innerHTML;
    const order = ['copy-day', 'copy-weeks', 'copy-child', 'save-template', 'delete-day'];
    let cursor = -1;
    for (const id of order) {
      const at = actions.indexOf(`data-day-action="${id}"`);
      assert.ok(at > cursor, `${id} should follow the previous day action`);
      cursor = at;
    }
    assert.match(actions, /schedule-sheet-danger/);
    assert.ok(actions.indexOf('schedule-sheet-danger') > actions.indexOf('save-template'));
    sandbox.ScheduleDaySheet.choose('delete-day');
    assert.equal(sheet.classList.contains('hidden'), true);
    assert.deepEqual(sandbox.opened, ['delete-day']);
    assert.doesNotMatch(read('public/js/schedule-day-sheet.js'), /z-index\s*:|z-\[\d+\]/);
    const css = read('public/css/parent-magic-common.css');
    assert.match(css, /\.schedule-menu-surface\.bg-white/);
    assert.match(css, /background:\s*#1b2340 !important/);
  });

  it('keeps Save inside the modal scroll and above the keyboard inset', () => {
    const page = read('public/schedule.html');
    const menu = read('public/js/schedule-add-menu.js');
    const scrollAt = menu.indexOf('class="sam-activity-scroll"');
    const footerAt = menu.indexOf('id="samActivityFooter"');
    const shellClose = menu.indexOf('</div>`;', footerAt);
    assert.ok(scrollAt > -1 && footerAt > scrollAt && shellClose > footerAt);
    assert.match(page, /#scheduleAddMenuModal \.sam-activity-footer[\s\S]*position:\s*sticky/);
    assert.match(page, /#scheduleAddMenuModal \.sam-activity-footer[\s\S]*bottom:\s*0/);
    assert.match(page, /#scheduleAddMenuModal #scheduleAddMenuPanel \{[\s\S]*max-height:\s*100%/);
    assert.match(read('public/css/app-layers.css'), /\[data-overlay="modal"\][\s\S]*bottom:\s*var\(--overlay-keyboard-inset\)/);
    assert.match(page, /#scheduleEditorView #scheduleAddMenuBtn \{ display: none !important; \}/);
  });

  it('uses the day ⋯ on mobile and keeps the desktop copy-day fallback in source', () => {
    const src = read('public/js/schedule.js');
    const render = src.slice(src.indexOf('function renderSchedule()'), src.indexOf('function renderItem'));
    assert.match(render, /ScheduleDaySheet\.isMobile\(\)/);
    assert.match(render, /ScheduleDaySheet\.triggerHtml\(\)/);
    assert.match(render, /ScheduleAddMenu\.openCopyDay\(\)/);
    assert.match(render, /<details/);
  });
});
