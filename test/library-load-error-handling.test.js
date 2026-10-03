'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

describe('library load error handling', () => {
  it('loadRewards shows error when API fails instead of staying on Laddar…', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/reward-editor.js'), 'utf8');
    assert.match(src, /showLoadError\(lpt\('library\.errors\.loadRewards'\)\)/);
    assert.match(src, /library\.errors\.loadRewards/);
  });

  it('loadActivities shows error when API fails', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /showLibraryLoadError\('activitiesContainer'/);
    assert.match(src, /library\.errors\.loadActivities/);
  });

  it('#treasury hash redirects to skattkammaren before magic hub init', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /initHash === 'treasury'/);
    assert.match(src, /window\.location\.href = '\/skattkammaren'/);
  });

  it('loads library data in parallel with magic hub init', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /const dataLoadPromise/);
    assert.match(src, /await dataLoadPromise/);
    assert.doesNotMatch(src, /await LibraryMagicHub\.init\(\)[\s\S]{0,120}await Promise\.all\(\[loadCategories/);
  });

  it('classic mode hash routing works when LibraryMagicHub is present', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /function routeLibraryHash/);
    assert.match(src, /LibraryMagicHub\.isMagic\(\)\) return/);
  });

  it('a name-only draft stays a create, not PUT /api/activities/undefined', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    const start = src.indexOf('async function openActivityModal');
    const end = src.indexOf('function closeActivityModal');
    const fn = src.slice(start, end);
    assert.match(fn, /const editing = !!\(act && act\.id\)/);
    assert.match(fn, /activityId'\)\.value = editing \? act\.id : ''/);
    assert.match(fn, /activityModalTitle'\)\.textContent = editing \?/);
    assert.match(fn, /selectStar\(act && act\.star_value \? act\.star_value : 1\)/);
    assert.doesNotMatch(fn, /activityId'\)\.value = act \? act\.id : ''/);
    assert.doesNotMatch(fn, /selectStar\(act \? act\.star_value : 1\)/);
  });

  it('switchTab retries activities load and sends rewards hash to /rewards', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8');
    assert.match(src, /isContainerLoading\('activitiesContainer'\)/);
    assert.match(src, /redirectLegacyRewardsHash/);
    assert.match(src, /location\.replace\('\/rewards'/);
  });
});

function libraryDraftSandbox(search) {
  const elements = new Map();
  const assigned = [];
  const fetches = [];

  function element(id) {
    if (!elements.has(id)) {
      const node = {
        id,
        _value: '',
        textContent: '',
        innerHTML: '',
        dataset: {},
        style: {},
        classList: {
          _set: new Set(),
          add(...names) { names.forEach((name) => this._set.add(name)); },
          remove(...names) { names.forEach((name) => this._set.delete(name)); },
          toggle(name, on) {
            const force = on === undefined ? !this._set.has(name) : !!on;
            if (force) this._set.add(name);
            else this._set.delete(name);
          },
          contains(name) { return this._set.has(name); },
          replace(from, to) { this._set.delete(from); this._set.add(to); },
        },
        addEventListener() {},
        focus() {},
        remove() {},
      };
      // HTMLInputElement stringifies a missing id. That is how
      // activityId.value = undefined became PUT /api/activities/undefined.
      Object.defineProperty(node, 'value', {
        get() { return this._value; },
        set(next) { this._value = String(next); },
      });
      elements.set(id, node);
    }
    return elements.get(id);
  }

  const location = {
    hash: '#activities',
    search,
    href: 'https://app.local/library' + search + '#activities',
    assign(url) { assigned.push(String(url)); },
    replace(url) { assigned.push(String(url)); },
  };

  const document = {
    addEventListener() {},
    getElementById(id) { return element(id); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { classList: { add() {}, remove() {} } },
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    showToast() {},
    escapeHtml(value) { return String(value == null ? '' : value); },
    document,
    location,
    window: {
      location,
      LibraryMagicHub: { isMagic() { return true; } },
      async apiFetch(url, opts) {
        const method = (opts && opts.method) || 'GET';
        fetches.push({ url: String(url), method, body: opts && opts.body });
        if (method === 'GET' && String(url) === '/api/activities') {
          return { ok: true, json: async () => [] };
        }
        if (method === 'GET' && String(url).endsWith('/sub-steps')) {
          return { ok: true, json: async () => [] };
        }
        return { ok: true, json: async () => ({ id: 'created-1' }) };
      },
    },
  };
  sandbox.LibraryMagicHub = sandbox.window.LibraryMagicHub;
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, 'public/js/library.js'), 'utf8'),
    sandbox,
    { filename: 'public/js/library.js' },
  );
  return { sandbox, elements, assigned, fetches, element };
}

describe('name-only activity draft', () => {
  const RETURN_URL = '/schedule?child=child-a&day=5';

  it('openActivityModal({ name }) creates with star 1 and returns to the same child and day', async () => {
    const search = '?new=1&name=X&return=' + encodeURIComponent(RETURN_URL);
    const harness = libraryDraftSandbox(search);

    harness.sandbox.openActivityEditorFromQuery();

    const idValue = harness.element('activityId').value;
    const starValue = harness.element('activityStarValue').value;
    assert.equal(idValue, '');
    assert.notEqual(idValue, 'undefined');
    assert.equal(starValue, '1');
    assert.notEqual(starValue, 'undefined');
    assert.equal(harness.element('activityName').value, 'X');
    assert.equal(harness.element('activityModalTitle').textContent, 'library.modal.newActivity');

    await harness.sandbox.submitActivity({ preventDefault() {} });

    assert.equal(harness.fetches.length, 1);
    assert.equal(harness.fetches[0].method, 'POST');
    assert.equal(harness.fetches[0].url, '/api/activities');
    assert.equal(JSON.parse(harness.fetches[0].body).star_value, 1);
    assert.equal(JSON.parse(harness.fetches[0].body).name, 'X');
    assert.deepEqual(harness.assigned, [RETURN_URL]);
  });

  it('an activity with an id still saves with PUT', async () => {
    const harness = libraryDraftSandbox('?edit=act-9');
    await harness.sandbox.openActivityModal({ id: 'act-9', name: 'Borsta tänderna', star_value: 3 });

    assert.equal(harness.element('activityId').value, 'act-9');
    assert.equal(harness.element('activityStarValue').value, '3');
    assert.equal(harness.element('activityModalTitle').textContent, 'library.modal.editActivity');

    await harness.sandbox.submitActivity({ preventDefault() {} });

    const save = harness.fetches.find((call) => call.method === 'PUT');
    assert.ok(save);
    assert.equal(save.url, '/api/activities/act-9');
    assert.equal(JSON.parse(save.body).star_value, 3);
    assert.deepEqual(harness.assigned, []);
  });
});

describe('rewards hub treasury link', () => {
  it('embeds per-child star overview instead of skattkammaren CTA', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/rewards-hub.js'), 'utf8');
    assert.doesNotMatch(src, /href="\/skattkammaren"/);
    assert.match(src, /proximityCopy/);
    assert.match(src, /dashboard-stats/);
  });
});
