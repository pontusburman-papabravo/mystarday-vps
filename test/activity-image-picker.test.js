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

function elementFactory() {
  const elements = new Map();
  const clicks = [];

  function element(id) {
    if (!elements.has(id)) {
      const node = {
        id,
        _value: '',
        textContent: '',
        innerHTML: '',
        alt: '',
        src: '',
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
        },
        addEventListener() {},
        focus() {},
        click() { clicks.push(id); },
        querySelectorAll() { return []; },
        setAttribute() {},
        getAttribute() { return null; },
        removeAttribute(name) { if (name === 'src') this.src = ''; },
      };
      Object.defineProperty(node, 'value', {
        get() { return this._value; },
        set(next) { this._value = String(next); },
      });
      elements.set(id, node);
    }
    return elements.get(id);
  }

  return { elements, clicks, element };
}

function imageSandbox(options) {
  const opts = options || {};
  const { elements, clicks, element } = elementFactory();
  const fetches = [];
  const uploads = [];
  const picks = [];
  const assigned = [];
  let uploadOk = opts.uploadOk !== false;
  const native = !!opts.native;
  const coarse = !!opts.coarse;

  const document = {
    addEventListener() {},
    getElementById(id) { return element(id); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    documentElement: { classList: { add() {}, remove() {} } },
    body: { appendChild() {}, removeChild() {} },
    createElement() { return { width: 0, height: 0, getContext() { return null; } }; },
  };

  const location = {
    hash: '#activities',
    search: opts.search || '',
    href: 'https://app.local/library' + (opts.search || '') + '#activities',
    assign(url) { assigned.push(String(url)); },
    replace(url) { assigned.push(String(url)); },
  };

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    URL,
    URLSearchParams,
    File,
    Blob,
    FormData,
    fetch: async (url) => {
      uploads.push(String(url));
      if (!uploadOk) {
        return { ok: false, status: 500, clone() { return this; }, json: async () => ({ error: 'upload-failed' }) };
      }
      return { ok: true, status: 200, clone() { return this; }, json: async () => ({ url: '/uploads/taken.jpg' }) };
    },
    showToast() {},
    confirm() { return true; },
    escapeHtml(value) { return String(value == null ? '' : value); },
    document,
    location,
    matchMedia() { return { matches: coarse }; },
    Platform: {
      isNative() { return native; },
      camera: {
        async pick(pickOpts) {
          picks.push(pickOpts || {});
          if (opts.pickResult !== undefined) return opts.pickResult;
          return { file: new File(['img'], 'taken.jpg', { type: '' }) };
        },
        async toAvatarFile(result) {
          return result.file;
        },
      },
    },
    window: {},
  };

  sandbox.window = sandbox;
  sandbox.window.window = sandbox;
  sandbox.window.document = document;
  sandbox.window.location = location;
  sandbox.window.Platform = sandbox.Platform;
  sandbox.window.matchMedia = sandbox.matchMedia;
  sandbox.window.LibraryMagicHub = { isMagic() { return true; } };
  sandbox.LibraryMagicHub = sandbox.window.LibraryMagicHub;
  sandbox.apiFetch = async (url, req) => {
    const method = (req && req.method) || 'GET';
    fetches.push({ url: String(url), method, body: req && req.body });
    if (method === 'GET' && String(url) === '/api/family/images') {
      return { ok: true, json: async () => (opts.images || []) };
    }
    if (method === 'POST' && String(url) === '/api/family/images') {
      if (opts.archiveOk === false) {
        return { ok: false, json: async () => ({ error: 'archive-failed' }) };
      }
      return { ok: true, json: async () => ({ id: 'img-1', image_url: '/uploads/taken.jpg', label: null }) };
    }
    if (method === 'GET' && String(url).endsWith('/sub-steps')) {
      return { ok: true, json: async () => [] };
    }
    if (method === 'GET' && String(url) === '/api/activities') {
      return { ok: true, json: async () => [] };
    }
    return { ok: true, json: async () => ({ id: opts.createdId || 'created-1' }) };
  };
  sandbox.window.apiFetch = sandbox.apiFetch;

  vm.runInNewContext(read('public/js/library-images.js'), sandbox, { filename: 'public/js/library-images.js' });
  if (opts.withLibrary) {
    vm.runInNewContext(read('public/js/library.js'), sandbox, { filename: 'public/js/library.js' });
  }

  return { sandbox, elements, clicks, fetches, uploads, picks, assigned, element };
}

function activityPosts(fetches) {
  return fetches.filter((call) => call.url === '/api/activities' || call.url.startsWith('/api/activities/'));
}

describe('activity image picker', () => {
  const html = read('public/library.html');

  it('keeps camera capture off the desktop file input', () => {
    assert.match(html, /id="activityImageCamera"[^>]*capture="environment"/);
    const fileInput = html.match(/<input type="file" id="activityImageFile"[^>]*>/)[0];
    assert.doesNotMatch(fileInput, /capture=/);
    assert.match(html, /id="activityTakePhotoBtn"/);
    assert.match(html, /id="activityPickDeviceBtn"/);
    assert.match(html, /id="activityImageError"[^>]*role="alert"/);
    assert.match(html, /data-i18n="library\.activityModal\.visualSupportLabel"/);
  });

  it('creates a new activity with an icon and no image', async () => {
    const harness = imageSandbox({ withLibrary: true, search: '?new=1&name=Borsta&return=' + encodeURIComponent('/schedule?child=c1&day=5&section=morgon') });
    await harness.sandbox.openActivityEditorFromQuery();
    harness.sandbox.selectIcon('🦷');
    await harness.sandbox.submitActivity({ preventDefault() {} });

    const post = activityPosts(harness.fetches).find((call) => call.method === 'POST' && call.url === '/api/activities');
    assert.ok(post);
    const body = JSON.parse(post.body);
    assert.equal(body.name, 'Borsta');
    assert.equal(body.icon, '🦷');
    assert.equal(body.image_url, null);
    assert.equal(body.icon_key, null);
    assert.equal(body.star_value, 1);
    assert.equal(harness.assigned[0], '/schedule?child=c1&day=5&section=morgon&place=created-1');
  });

  it('creates a new activity with an existing archive image and does not auto-select', async () => {
    const harness = imageSandbox({
      withLibrary: true,
      images: [{ id: 'img-9', image_url: '/uploads/brush.jpg', label: 'Tandborste' }],
    });
    await harness.sandbox.openActivityModal({ name: 'Borsta' });
    assert.equal(harness.sandbox.LibraryImages.isPhotoMode(), false);
    assert.equal(harness.sandbox.LibraryImages.getSelectedUrl(), null);

    harness.element('activityImageUrl').value = '/uploads/brush.jpg';
    harness.sandbox.LibraryImages.setVisualMode('photo');
    await harness.sandbox.submitActivity({ preventDefault() {} });

    const post = activityPosts(harness.fetches).find((call) => call.method === 'POST');
    const body = JSON.parse(post.body);
    assert.equal(body.image_url, '/uploads/brush.jpg');
    assert.equal(body.icon, null);
    assert.equal(body.name, 'Borsta');
  });

  it('creates a new activity from a taken photo', async () => {
    const harness = imageSandbox({ withLibrary: true, native: true });
    await harness.sandbox.openActivityModal({ name: 'Duscha' });
    const row = await harness.sandbox.LibraryImages.takePhoto();
    assert.equal(row.image_url, '/uploads/taken.jpg');
    assert.equal(harness.picks[0].source, 'camera');
    assert.equal(harness.uploads.length, 1);
    await harness.sandbox.submitActivity({ preventDefault() {} });
    const post = activityPosts(harness.fetches).find((call) => call.method === 'POST' && call.url === '/api/activities');
    const body = JSON.parse(post.body);
    assert.equal(body.name, 'Duscha');
    assert.equal(body.image_url, '/uploads/taken.jpg');
    assert.equal(body.icon, null);
  });

  it('edits an activity from icon to image without dropping other fields', async () => {
    const harness = imageSandbox({ withLibrary: true });
    await harness.sandbox.openActivityModal({
      id: 'act-9',
      name: 'Borsta tänderna',
      icon: '🦷',
      star_value: 3,
      category_id: 'cat-1',
      is_favorite: true,
      feedback_for: 'child',
    });
    harness.element('activityImageUrl').value = '/uploads/brush.jpg';
    harness.sandbox.LibraryImages.setVisualMode('photo');
    await harness.sandbox.submitActivity({ preventDefault() {} });
    const put = activityPosts(harness.fetches).find((call) => call.method === 'PUT');
    assert.equal(put.url, '/api/activities/act-9');
    const body = JSON.parse(put.body);
    assert.equal(body.image_url, '/uploads/brush.jpg');
    assert.equal(body.icon, '🦷');
    assert.equal(body.name, 'Borsta tänderna');
    assert.equal(body.star_value, 3);
    assert.equal(body.category_id, 'cat-1');
    assert.equal(body.is_favorite, true);
    assert.equal(body.feedback_for, 'child');
    assert.equal(body.icon_key, undefined);
    assert.deepEqual(harness.assigned, []);
  });

  it('edits an activity from image back to a chosen icon', async () => {
    const harness = imageSandbox({ withLibrary: true });
    await harness.sandbox.openActivityModal({
      id: 'act-9',
      name: 'Borsta tänderna',
      icon: '🦷',
      image_url: '/uploads/brush.jpg',
      star_value: 4,
    });
    assert.equal(harness.sandbox.LibraryImages.isPhotoMode(), true);
    assert.equal(harness.sandbox.LibraryImages.getSelectedUrl(), '/uploads/brush.jpg');
    harness.sandbox.LibraryImages.setVisualMode('emoji');
    harness.sandbox.selectIcon('🪥');
    await harness.sandbox.submitActivity({ preventDefault() {} });
    const body = JSON.parse(activityPosts(harness.fetches).find((call) => call.method === 'PUT').body);
    assert.equal(body.image_url, null);
    assert.equal(body.icon, '🪥');
    assert.equal(body.icon_key, null);
    assert.equal(body.star_value, 4);
    assert.equal(body.name, 'Borsta tänderna');
  });

  it('removes the image and falls back to the existing icon', async () => {
    const harness = imageSandbox({ withLibrary: true });
    await harness.sandbox.openActivityModal({
      id: 'act-9',
      name: 'Borsta tänderna',
      icon: '🦷',
      image_url: '/uploads/brush.jpg',
      star_value: 2,
    });
    harness.sandbox.LibraryImages.setVisualMode('emoji');
    assert.equal(harness.sandbox.LibraryImages.isPhotoMode(), false);
    assert.equal(harness.sandbox.LibraryImages.getSelectedUrl(), null);
    assert.equal(harness.element('activityIcon').value, '🦷');
    await harness.sandbox.submitActivity({ preventDefault() {} });
    const body = JSON.parse(activityPosts(harness.fetches).find((call) => call.method === 'PUT').body);
    assert.equal(body.image_url, null);
    assert.equal(body.icon, '🦷');
    assert.equal(body.icon_key, undefined);
    assert.equal(body.star_value, 2);
  });

  it('returns a week create to the same child, day, and section and places it', async () => {
    const ret = '/schedule?child=child-a&day=5&section=morgon';
    const harness = imageSandbox({
      withLibrary: true,
      search: '?new=1&name=Ny&return=' + encodeURIComponent(ret),
    });
    await harness.sandbox.openActivityEditorFromQuery();
    harness.sandbox.selectIcon('⭐');
    await harness.sandbox.submitActivity({ preventDefault() {} });
    assert.equal(harness.assigned[0], ret + '&place=created-1');
    assert.equal(activityPosts(harness.fetches).filter((call) => call.method === 'POST' && call.url === '/api/activities').length, 1);
  });

  it('renders the saved image on the week and falls back to the icon', () => {
    const visual = read('public/js/activity-visual.js');
    const schedule = read('public/js/schedule.js');
    const start = schedule.indexOf('function scheduleActivityVisual');
    const end = schedule.indexOf('async function placeCreatedActivityIfRequested');
    const sandbox = { window: {}, URLSearchParams, console };
    sandbox.window = sandbox;
    vm.runInNewContext(visual + '\n' + schedule.slice(start, end), sandbox, { filename: 'schedule-visual.js' });
    const photo = sandbox.scheduleActivityVisual({
      activity_image_url: '/uploads/taken.jpg',
      activity_icon: '🦷',
    });
    assert.match(photo, /src="\/uploads\/taken\.jpg"/);
    assert.match(photo, /schedule-activity-visual/);
    const icon = sandbox.scheduleActivityVisual({ activity_icon: '🦷' });
    assert.equal(icon, '🦷');
    const spec = sandbox.schedulePlaceFromSearch('child=child-a&day=5&section=morgon&place=act-1');
    assert.equal(spec.activityTemplateId, 'act-1');
    assert.equal(spec.section, 'morgon');
    assert.equal(spec.day, 5);
    assert.equal(sandbox.schedulePlaceFromSearch('day=5'), null);

    assert.match(read('src/routes/schedules/items.js'), /at\.image_url AS activity_image_url/);
    assert.match(schedule, /scheduleActivityVisual\(item\)/);
    assert.match(schedule, /ScheduleApplyClient\.applyActivity/);
    assert.match(schedule, /searchParams\.delete\('place'\)/);
  });

  it('does not create an activity when the upload fails or the picker is cancelled', async () => {
    const failed = imageSandbox({ withLibrary: true, native: true, uploadOk: false });
    await failed.sandbox.openActivityModal({ name: 'Duscha' });
    const row = await failed.sandbox.LibraryImages.takePhoto();
    assert.equal(row, null);
    assert.equal(failed.element('activityImageError').classList.contains('hidden'), false);
    assert.equal(failed.element('activityName').value, 'Duscha');
    assert.equal(activityPosts(failed.fetches).length, 0);
    assert.equal(failed.element('activityId').value, '');

    const cancelled = imageSandbox({
      withLibrary: true,
      native: true,
      pickResult: null,
    });
    await cancelled.sandbox.openActivityModal({ name: 'Duscha' });
    const cancelledRow = await cancelled.sandbox.LibraryImages.takePhoto();
    assert.equal(cancelledRow, null);
    assert.equal(cancelled.element('activityName').value, 'Duscha');
    assert.equal(cancelled.element('activityImageError').classList.contains('hidden'), true);
    assert.equal(activityPosts(cancelled.fetches).length, 0);
  });

  it('uses the file picker on desktop and the capture input on a coarse pointer', async () => {
    const desktop = imageSandbox({ withLibrary: true, native: false, coarse: false });
    await desktop.sandbox.LibraryImages.takePhoto();
    assert.deepEqual(desktop.clicks, ['activityImageFile']);
    assert.equal(desktop.picks.length, 0);

    const phone = imageSandbox({ withLibrary: true, native: false, coarse: true });
    await phone.sandbox.LibraryImages.takePhoto();
    assert.deepEqual(phone.clicks, ['activityImageCamera']);

    const libraryPick = imageSandbox({ withLibrary: true, native: false, coarse: true });
    await libraryPick.sandbox.LibraryImages.pickFromDevice();
    assert.deepEqual(libraryPick.clicks, ['activityImageFile']);
  });
});
