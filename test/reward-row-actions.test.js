'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const sv = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/i18n/library-sv-SE.json'), 'utf8'));

function flatten(obj, prefix, out) {
  Object.keys(obj).forEach(function (key) {
    const next = prefix ? prefix + '.' + key : key;
    if (obj[key] && typeof obj[key] === 'object') flatten(obj[key], next, out);
    else out[next] = obj[key];
  });
  return out;
}

const copy = flatten(sv, 'library', {});

function pt(key, params) {
  let text = Object.prototype.hasOwnProperty.call(copy, key) ? copy[key] : key;
  if (params) {
    Object.keys(params).forEach(function (name) {
      text = text.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), String(params[name]));
    });
  }
  return text;
}

function makeEl(id) {
  const el = {
    id: id,
    nodeType: 1,
    classSet: new Set(['hidden']),
    dataset: {},
    style: {},
    innerHTML: '',
    textContent: '',
    attributes: {},
    addEventListener: function () {},
  };
  el.classList = {
    contains: function (token) { return el.classSet.has(token); },
    add: function (token) { el.classSet.add(token); },
    remove: function (token) { el.classSet.delete(token); },
    toggle: function (token, force) {
      const on = force === undefined ? !el.classSet.has(token) : !!force;
      if (on) el.classSet.add(token);
      else el.classSet.delete(token);
    },
  };
  el.getAttribute = function (key) {
    return Object.prototype.hasOwnProperty.call(el.attributes, key) ? el.attributes[key] : null;
  };
  el.setAttribute = function (key, value) { el.attributes[key] = String(value); };
  el.hasAttribute = function (key) {
    return Object.prototype.hasOwnProperty.call(el.attributes, key);
  };
  return el;
}

function buttonText(html, action) {
  const match = String(html).match(new RegExp('data-reward-action="' + action + '"[^>]*>([^<]+)'));
  return match ? match[1].trim() : '';
}

function bootEditor(rewards) {
  const calls = [];
  const els = {
    rewardsContainer: makeEl('rewardsContainer'),
    rewardActionSheet: makeEl('rewardActionSheet'),
    rewardActionSheetTitle: makeEl('rewardActionSheetTitle'),
    rewardActionSheetActions: makeEl('rewardActionSheetActions'),
    rewardConfirmModal: makeEl('rewardConfirmModal'),
    rewardConfirmTitle: makeEl('rewardConfirmTitle'),
    rewardConfirmMsg: makeEl('rewardConfirmMsg'),
    rewardConfirmOk: makeEl('rewardConfirmOk'),
  };
  const document = {
    readyState: 'complete',
    body: { dataset: { i18nManualInit: 'true' } },
    addEventListener: function () {},
    querySelectorAll: function () { return []; },
    getElementById: function (id) { return els[id] || null; },
  };
  const sandbox = {
    console: console,
    document: document,
    URLSearchParams: URLSearchParams,
    window: null,
    setTimeout: setTimeout,
  };
  sandbox.window = sandbox;
  sandbox.location = { search: '' };
  sandbox.pt = pt;
  sandbox.showToast = function () {};
  sandbox.apiFetch = async function (url, options) {
    const method = ((options && options.method) || 'GET').toUpperCase();
    const body = options && options.body ? JSON.parse(options.body) : null;
    calls.push({ url: url, method: method, body: body });
    if (method === 'GET') {
      return { ok: true, json: async function () { return { rewards: rewards.map(function (r) { return Object.assign({}, r); }), children: [] }; } };
    }
    if (method === 'PUT') {
      return { ok: true, json: async function () { return { id: rewards[0].id, is_active: body.is_active }; } };
    }
    if (method === 'DELETE') {
      const kept = Number(rewards[0].redemption_count) > 0;
      return {
        ok: true,
        json: async function () {
          return kept
            ? { code: 'REWARD_DELETED', reward_deleted: false, is_active: false }
            : { code: 'REWARD_DELETED', reward_deleted: true };
        },
      };
    }
    return { ok: false, json: async function () { return {}; } };
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/reward-row-actions.js'), 'utf8'), sandbox, { filename: 'reward-row-actions.js' });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/reward-editor.js'), 'utf8'), sandbox, { filename: 'reward-editor.js' });
  return { sandbox: sandbox, els: els, calls: calls };
}

async function settle() {
  await new Promise(function (resolve) { setImmediate(resolve); });
}

describe('reward row actions', function () {
  const active = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Bio',
    icon: '🎬',
    star_cost: 5,
    is_active: true,
    requires_approval: false,
    redemption_count: 0,
    goal_count: 0,
  };

  it('active reward … shows Avaktivera', async function () {
    const ui = bootEditor([active]);
    await settle();
    ui.sandbox.openRewardActions(active.id);
    assert.equal(ui.els.rewardActionSheet.classList.contains('hidden'), false);
    assert.equal(buttonText(ui.els.rewardActionSheetActions.innerHTML, 'toggle'), 'Avaktivera');
    assert.equal(buttonText(ui.els.rewardActionSheetActions.innerHTML, 'delete'), 'Radera');
  });

  it('inactive reward … shows Aktivera', async function () {
    const ui = bootEditor([Object.assign({}, active, { is_active: false })]);
    await settle();
    ui.sandbox.openRewardActions(active.id);
    assert.equal(buttonText(ui.els.rewardActionSheetActions.innerHTML, 'toggle'), 'Aktivera');
  });

  it('deactivate saves is_active and the card shows Avaktiverad', async function () {
    const ui = bootEditor([active]);
    await settle();
    await ui.sandbox.toggleRewardActive(active.id, true);
    const put = ui.calls.find(function (call) { return call.method === 'PUT'; });
    assert.deepEqual(put.body, { is_active: false });
    assert.match(ui.els.rewardsContainer.innerHTML, /data-reward-status="inactive"/);
    assert.match(ui.els.rewardsContainer.innerHTML, /Avaktiverad/);
    assert.match(ui.els.rewardsContainer.innerHTML, /reward-row-inactive/);
  });

  it('activate saves is_active and the Avaktiverad label disappears', async function () {
    const ui = bootEditor([Object.assign({}, active, { is_active: false })]);
    await settle();
    assert.match(ui.els.rewardsContainer.innerHTML, /Avaktiverad/);
    await ui.sandbox.toggleRewardActive(active.id, false);
    const put = ui.calls.find(function (call) { return call.method === 'PUT'; });
    assert.deepEqual(put.body, { is_active: true });
    assert.match(ui.els.rewardsContainer.innerHTML, /data-reward-status="active"/);
    assert.doesNotMatch(ui.els.rewardsContainer.innerHTML, /Avaktiverad/);
  });

  it('delete opens confirm and does not call the API yet', async function () {
    const ui = bootEditor([active]);
    await settle();
    ui.sandbox.deleteReward(active.id);
    assert.equal(ui.els.rewardConfirmModal.classList.contains('hidden'), false);
    assert.equal(ui.els.rewardConfirmTitle.textContent, 'Radera belöningen?');
    assert.equal(ui.els.rewardConfirmMsg.textContent, 'Belöningen tas bort permanent.');
    assert.equal(ui.els.rewardConfirmOk.textContent, 'Radera');
    assert.equal(ui.calls.some(function (call) { return call.method === 'DELETE'; }), false);
  });

  it('cancelling delete leaves the reward unchanged', async function () {
    const ui = bootEditor([active]);
    await settle();
    const before = ui.els.rewardsContainer.innerHTML;
    ui.sandbox.deleteReward(active.id);
    ui.sandbox.closeRewardConfirmModal();
    assert.equal(ui.els.rewardConfirmModal.classList.contains('hidden'), true);
    assert.equal(ui.calls.some(function (call) { return call.method === 'DELETE'; }), false);
    assert.equal(ui.els.rewardsContainer.innerHTML, before);
  });

  it('confirmed delete removes the reward from the list', async function () {
    const ui = bootEditor([active]);
    await settle();
    ui.sandbox.deleteReward(active.id);
    await ui.sandbox.confirmRewardAction();
    assert.equal(ui.calls.some(function (call) { return call.method === 'DELETE'; }), true);
    assert.doesNotMatch(ui.els.rewardsContainer.innerHTML, /data-id="/);
  });

  it('a reward with redemptions explains the kept history before delete', async function () {
    const ui = bootEditor([Object.assign({}, active, { redemption_count: 2 })]);
    await settle();
    ui.sandbox.deleteReward(active.id);
    assert.match(ui.els.rewardConfirmMsg.textContent, /lösts in 2 gånger/);
    assert.doesNotMatch(ui.els.rewardConfirmMsg.textContent, /tas bort permanent/);
  });

  it('action sheet at 390px uses the modal layer so nav and FAB are not on top', function () {
    const html = fs.readFileSync(path.join(ROOT, 'public/rewards.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'public/css/app-layers.css'), 'utf8');
    const theme = fs.readFileSync(path.join(ROOT, 'public/css/theme.css'), 'utf8');
    const editor = fs.readFileSync(path.join(ROOT, 'public/js/reward-editor.js'), 'utf8');
    const sheet = html.slice(html.indexOf('id="rewardActionSheet"') - 5, html.indexOf('id="rewardConfirmModal"'));
    assert.match(sheet, /data-overlay="modal"/);
    assert.match(sheet, /fixed inset-0/);
    assert.match(sheet, /items-end/);
    assert.doesNotMatch(sheet, /z-\[|z-50|z-index/);
    assert.doesNotMatch(editor, /rewardActionSheet[\s\S]{0,400}zIndex|style\.zIndex/);
    assert.match(theme, /@media \(max-width: 639px\) \{\s*\.icon-btns-desktop \{ display: none !important; \}/);
    assert.match(css, /body\.modal-open \.parent-bottom-nav/);
    assert.match(css, /body\.modal-open #globalFeedbackBtn/);
    assert.match(css, /body\.modal-open \.global-feedback-fab/);
    assert.match(css, /visibility:\s*hidden !important/);
    assert.match(css, /pointer-events:\s*none !important/);

    const nav = makeEl('bottomNav');
    nav.classList.remove('hidden');
    nav.classList.add('parent-bottom-nav');
    const fab = makeEl('globalFeedbackBtn');
    fab.classList.remove('hidden');
    const sheetEl = makeEl('rewardActionSheet');
    sheetEl.classList.add('fixed');
    sheetEl.classList.add('inset-0');
    sheetEl.setAttribute('data-overlay', 'modal');
    const body = makeEl('body');
    body.classList.remove('hidden');
    body.children = [];
    body.appendChild = function (child) {
      child.parentNode = body;
      body.children.push(child);
    };
    [nav, fab, sheetEl].forEach(function (el) { body.appendChild(el); });
    const doc = {
      readyState: 'complete',
      body: body,
      documentElement: { style: { setProperty: function () {} } },
      addEventListener: function () {},
      querySelectorAll: function () { return body.children.slice(); },
    };
    body.ownerDoc = doc;
    const sandbox = {
      console: console,
      document: doc,
      MutationObserver: function () {},
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      addEventListener: function () {},
      removeEventListener: function () {},
      innerHeight: 844,
    };
    sandbox.MutationObserver.prototype.observe = function () {};
    sandbox.MutationObserver.prototype.disconnect = function () {};
    sandbox.window = sandbox;
    sandbox.visualViewport = { height: 390, offsetTop: 0, addEventListener: function () {}, removeEventListener: function () {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'public/js/modal-open-observer.js'), 'utf8'), sandbox, { filename: 'modal-open-observer.js' });
    assert.equal(body.classList.contains('modal-open'), false);
    sheetEl.classList.remove('hidden');
    sandbox.OverlayPolicy.sync();
    assert.equal(body.classList.contains('modal-open'), true);
    assert.equal(sandbox.OverlayPolicy.isBlocking(sheetEl), true);
    assert.equal(sheetEl.style.zIndex || '', '');
  });
});
