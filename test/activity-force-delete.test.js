'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function element(id) {
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    classSet: new Set(id === 'confirmModal' ? ['hidden'] : []),
    onclick: null,
  };
  el.classList = {
    contains(token) { return el.classSet.has(token); },
    add(token) { el.classSet.add(token); },
    remove(token) { el.classSet.delete(token); },
  };
  el.addEventListener = function () {};
  return el;
}

function bootLibrary(responses) {
  const elements = {
    confirmModal: element('confirmModal'),
    confirmMsg: element('confirmMsg'),
    confirmOkBtn: element('confirmOkBtn'),
    confirmTitle: element('confirmTitle'),
    activitiesContainer: element('activitiesContainer'),
  };
  const fetches = [];
  const toasts = [];
  let responseIndex = 0;
  const doc = {
    readyState: 'loading',
    body: { dataset: {} },
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    addEventListener() {},
  };
  const sandbox = {
    console,
    document: doc,
    escapeHtml(value) { return String(value || ''); },
    setTimeout,
    clearTimeout,
    pt(key, params) {
      const map = {
        'library.confirm.deleteActivity': 'Ta bort aktiviteten "{{name}}"?',
        'library.confirm.deleteActivityInUseTitle': 'Ta bort aktiviteten?',
        'library.confirm.deleteActivityInUse': 'Aktiviteten används i ett eller flera veckoscheman. Om du tar bort den här tas den också bort från dessa scheman.',
        'library.confirm.deleteAnyway': 'Ta bort ändå',
        'library.confirm.usedInSchedules.one': 'Används i {{count}} veckoschema.',
        'library.confirm.usedInSchedules.other': 'Används i {{count}} veckoscheman.',
        'library.chrome.confirmTitle': 'Bekräfta borttagning',
        'library.actions.delete': 'Ta bort',
        'library.saved.activityDeleted': 'Aktiviteten har tagits bort',
        'library.errors.deleteActivity': 'Kunde inte ta bort aktiviteten',
        'library.empty.libraryTitle': 'Tomt',
        'library.empty.libraryBody': 'Tomt',
        'library.empty.createFirstActivity': 'Skapa',
      };
      let text = map[key] || key;
      if (params) {
        Object.keys(params).forEach(function (name) {
          text = text.split('{{' + name + '}}').join(String(params[name]));
        });
      }
      return text;
    },
    showToast(message, isError) { toasts.push({ message, isError: !!isError }); },
    apiFetch: async function (url) {
      fetches.push(url);
      const next = responses[responseIndex++] || { ok: true, status: 200, body: [] };
      return {
        ok: next.ok,
        status: next.status,
        json: async function () { return next.body; },
      };
    },
  };
  sandbox.window = sandbox;
  sandbox.I18n = {
    plural(baseKey, count) {
      const suffix = Number(count) === 1 ? 'one' : 'other';
      return sandbox.pt(baseKey + '.' + suffix, { count });
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/library.js'), sandbox, { filename: 'library.js' });
  return { sandbox, elements, fetches, toasts };
}

async function confirm(page) {
  await page.elements.confirmOkBtn.onclick();
}

describe('activity delete confirm', () => {
  it('does not delete on the first click when the activity is on a schedule', async () => {
    const page = bootLibrary([
      { ok: false, status: 409, body: { code: 'ACTIVITY_IN_USE', schedule_count: 3, schedule_reference_count: 4 } },
    ]);
    page.sandbox.deleteActivity('act-1', 'Bio');
    assert.equal(page.fetches.length, 0);
    assert.equal(page.elements.confirmModal.classList.contains('hidden'), false);
    assert.match(page.elements.confirmMsg.innerHTML, /Ta bort aktiviteten "Bio"/);
    await confirm(page);
    assert.deepEqual(page.fetches, ['/api/activities/act-1']);
    assert.equal(page.elements.confirmTitle.textContent, 'Ta bort aktiviteten?');
    assert.equal(page.elements.confirmOkBtn.textContent, 'Ta bort ändå');
    assert.match(page.elements.confirmMsg.innerHTML, /tas den också bort från dessa scheman/);
    assert.match(page.elements.confirmMsg.innerHTML, /Används i 3 veckoscheman/);
    assert.equal(page.toasts.length, 0);
  });

  it('cancel after the in-use warning sends no force delete', async () => {
    const page = bootLibrary([
      { ok: false, status: 409, body: { code: 'ACTIVITY_IN_USE', schedule_count: 1 } },
    ]);
    page.sandbox.deleteActivity('act-1', 'Bio');
    await confirm(page);
    page.sandbox.closeConfirmModal();
    assert.deepEqual(page.fetches, ['/api/activities/act-1']);
    assert.equal(page.elements.confirmModal.classList.contains('hidden'), true);
    assert.equal(page.toasts.length, 0);
  });

  it('delete anyway removes schedule references and the activity', async () => {
    const page = bootLibrary([
      { ok: false, status: 409, body: { code: 'ACTIVITY_IN_USE', schedule_count: 2 } },
      { ok: true, status: 200, body: { activity_deleted: true, number_of_schedule_references_removed: 2 } },
      { ok: true, status: 200, body: [] },
    ]);
    page.sandbox.deleteActivity('act-9', 'Bio');
    await confirm(page);
    await confirm(page);
    assert.deepEqual(page.fetches, [
      '/api/activities/act-9',
      '/api/activities/act-9?force=1',
      '/api/activities',
    ]);
    assert.equal(page.toasts[0].message, 'Aktiviteten har tagits bort');
    assert.equal(page.toasts[0].isError, false);
  });

  it('a failed force delete reloads the list and shows an error', async () => {
    const page = bootLibrary([
      { ok: false, status: 409, body: { code: 'ACTIVITY_IN_USE', schedule_count: 2 } },
      { ok: false, status: 500, body: { code: 'ACTIVITY_SERVER_ERROR' } },
      { ok: true, status: 200, body: [{ id: 'act-9', name: 'Bio' }] },
    ]);
    page.sandbox.deleteActivity('act-9', 'Bio');
    await confirm(page);
    await confirm(page);
    assert.equal(page.fetches[1], '/api/activities/act-9?force=1');
    assert.equal(page.fetches[2], '/api/activities');
    assert.equal(page.toasts[0].isError, true);
  });

  it('uses the canonical overlay mark and no new z-index', () => {
    const html = read('public/library.html');
    assert.match(html, /id="confirmModal"[^>]*data-overlay="modal"/);
    const js = read('public/js/library.js');
    assert.match(js, /openForceDeleteModal/);
    assert.match(js, /\?force=1/);
    assert.doesNotMatch(js, /zIndex|z-\[/);
    const route = read('src/routes/activities.js');
    assert.match(route, /BEGIN/);
    assert.match(route, /ROLLBACK/);
    assert.match(route, /DELETE FROM weekly_schedule_item/);
    assert.match(route, /activity_deleted: true/);
    assert.match(route, /number_of_schedule_references_removed/);
  });
});
