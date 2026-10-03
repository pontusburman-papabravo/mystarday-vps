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

function copy() {
  return {
    'library.empty.rewardsTitle': 'Inga belöningar ännu',
    'library.empty.rewardsBody': 'Lägg till belöningar som barnen kan tjäna ihop stjärnor till.',
    'library.empty.addReward': '+ Ny belöning',
    'library.page.addReward': '+ Ny belöning',
    'library.empty.noSearchReward': 'Inga belöningar matchar "{{query}}"',
    'library.empty.createRewardHint': 'Skapa en ny belöning med det här namnet',
    'library.empty.yourRewards': 'Dina belöningar',
    'library.errors.loadRewards': 'Kunde inte ladda belöningar. Försök ladda om sidan.',
    'library.rewardsHub.retry': 'Försök igen',
    'library.searching': 'Söker…',
    'library.rewards.allChildren': 'Alla barn',
    'library.rewards.hiddenFromAll': 'Dold för alla',
    'library.modal.approvalBadge': 'Godkännande',
  };
}

function pt(key, params) {
  let text = copy()[key] || key;
  if (params) {
    Object.keys(params).forEach(function (name) {
      text = text.replace('{{' + name + '}}', String(params[name]));
    });
  }
  return text;
}

function element(id) {
  const el = {
    id: id,
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    style: {},
    classSet: new Set(),
  };
  el.classList = {
    contains(token) { return el.classSet.has(token); },
    add(token) { el.classSet.add(token); },
    remove(token) { el.classSet.delete(token); },
    toggle(token, force) {
      const on = force === undefined ? !el.classSet.has(token) : !!force;
      if (on) el.classSet.add(token);
      else el.classSet.delete(token);
    },
  };
  el.addEventListener = function () {};
  el.querySelectorAll = function () { return []; };
  el.closest = function () { return null; };
  return el;
}

const BIO = {
  id: 'r-bio',
  name: 'Bio',
  icon: '🎬',
  star_cost: 15,
  requires_approval: true,
  is_active: true,
  is_favorite: false,
  sort_order: 0,
  visible_to_children: null,
  source_default_id: null,
  modified_by_family: false,
};
const BOK = {
  id: 'r-bok',
  name: 'Bok',
  icon: '📖',
  star_cost: 8,
  requires_approval: true,
  is_active: true,
  is_favorite: false,
  sort_order: 1,
  visible_to_children: ['child-a'],
  source_default_id: null,
  modified_by_family: false,
};
const GLASS = {
  id: 'r-glass',
  name: 'Glass',
  icon: '🍦',
  star_cost: 5,
  requires_approval: false,
  is_active: true,
  is_favorite: false,
  sort_order: 2,
  visible_to_children: ['child-b'],
  source_default_id: null,
  modified_by_family: true,
};
const CHILDREN = [
  { id: 'child-a', name: 'Astrid', emoji: '⭐' },
  { id: 'child-b', name: 'Bo', emoji: '🌙' },
];

function parentPayload(rewards, children) {
  return { rewards: rewards, children: children || CHILDREN };
}

async function bootRewards(options) {
  options = options || {};
  const elements = {};
  ['rewardsContainer', 'rewardSearchResults', 'rewardIconPicker', 'rewardModal', 'rewardConfirmModal', 'rewardRequiresApproval', 'approvalToggle', 'approvalDot'].forEach(function (id) {
    elements[id] = element(id);
  });
  elements.rewardsContainer.innerHTML = 'Laddar belöningar…';
  elements.rewardSearchResults.classList.add('hidden');
  const fetches = [];
  let rewardCalls = 0;
  let standardCalls = 0;
  const listeners = {};
  const doc = {
    readyState: options.readyState || 'complete',
    body: { dataset: { i18nManualInit: 'true' } },
    getElementById(id) { return elements[id] || null; },
    querySelectorAll() { return []; },
    addEventListener(type, fn) {
      (listeners[type] || (listeners[type] = [])).push(fn);
    },
  };
  const sandbox = {
    console,
    document: doc,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    pt: pt,
    location: { search: options.search || '' },
    apiFetch: async function (url) {
      fetches.push(url);
      if (String(url).indexOf('/api/standard-library/rewards') !== -1) {
        standardCalls += 1;
        const wait = standardCalls === 1 ? (options.standardDelay || 0) : 0;
        if (wait) await new Promise(function (resolve) { setTimeout(resolve, wait); });
        return {
          ok: true,
          json: async function () { return options.standardRewards || []; },
        };
      }
      rewardCalls += 1;
      if (options.fail === 'always' || (options.fail === 'first' && rewardCalls === 1)) {
        return { ok: false, status: 500, json: async function () { return { error: 'REWARD_SERVER_ERROR' }; } };
      }
      if (options.throwLoad) throw new Error('network');
      return {
        ok: true,
        status: 200,
        json: async function () {
          return options.payload || parentPayload([BIO, BOK]);
        },
      };
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(read('public/js/reward-row-actions.js'), sandbox, { filename: 'reward-row-actions.js' });
  vm.runInContext(read('public/js/reward-editor.js'), sandbox, { filename: 'reward-editor.js' });
  if (doc.readyState !== 'loading') {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  }
  return { sandbox, elements, fetches, listeners, doc };
}

describe('rewards list loading', () => {
  it('boots on /rewards even when i18n is manual and shows both rewards', async () => {
    const page = await bootRewards();
    assert.equal(page.listeners['parent-i18n-ready'] ? page.listeners['parent-i18n-ready'].length : 0, 1);
    assert.deepEqual(page.fetches, ['/api/rewards']);
    const list = page.elements.rewardsContainer;
    assert.equal(list.dataset.rewardsState, 'ready');
    assert.match(list.innerHTML, /Bio/);
    assert.match(list.innerHTML, /Bok/);
    assert.doesNotMatch(list.innerHTML, /Laddar belöningar/);
    assert.doesNotMatch(read('public/js/reward-editor.js'), /i18nManualInit/);
  });

  it('shows an empty state when the API returns zero rewards', async () => {
    const page = await bootRewards({ payload: parentPayload([]) });
    const list = page.elements.rewardsContainer;
    assert.equal(list.dataset.rewardsState, 'empty');
    assert.match(list.innerHTML, /Inga belöningar ännu/);
    assert.match(list.innerHTML, /\+ Ny belöning/);
    assert.doesNotMatch(list.innerHTML, /Laddar belöningar/);
  });

  it('clears loading and offers retry when the API fails', async () => {
    const page = await bootRewards({ fail: 'first' });
    const list = page.elements.rewardsContainer;
    assert.equal(list.dataset.rewardsState, 'error');
    assert.match(list.innerHTML, /Kunde inte ladda belöningar/);
    assert.match(list.innerHTML, /Försök igen/);
    assert.doesNotMatch(list.innerHTML, /Laddar belöningar/);
    await page.sandbox.RewardEditor.reload();
    assert.equal(list.dataset.rewardsState, 'ready');
    assert.match(list.innerHTML, /Bio/);
    assert.doesNotMatch(list.innerHTML, /Laddar belöningar/);
  });

  it('renders the current parent list shape { rewards, children }', async () => {
    const payload = parentPayload([BIO, BOK], CHILDREN);
    assert.ok(Array.isArray(payload.rewards));
    assert.ok(Array.isArray(payload.children));
    assert.equal(payload.rewards[0].visible_to_children, null);
    assert.deepEqual(payload.rewards[1].visible_to_children, ['child-a']);
    const page = await bootRewards({ payload: payload });
    const list = page.elements.rewardsContainer;
    assert.equal(list.dataset.rewardsState, 'ready');
    assert.match(list.innerHTML, /data-id="r-bio"/);
    assert.match(list.innerHTML, /data-id="r-bok"/);
    assert.match(list.innerHTML, /15 ⭐/);
    assert.match(list.innerHTML, /8 ⭐/);
  });

  it('filters the loaded list to the child in the query', async () => {
    const page = await bootRewards({
      search: '?child=child-a',
      payload: parentPayload([BIO, BOK, GLASS], CHILDREN),
    });
    const html = page.elements.rewardsContainer.innerHTML;
    assert.match(html, /Bio/);
    assert.match(html, /Bok/);
    assert.doesNotMatch(html, /Glass/);
    assert.equal(page.elements.rewardsContainer.dataset.rewardsState, 'ready');
  });

  it('filters locally after load and does not put the list back into loading', async () => {
    const page = await bootRewards({
      payload: parentPayload([BIO, BOK]),
      standardRewards: [],
    });
    await page.sandbox.onRewardSearch('Bio');
    const results = page.elements.rewardSearchResults;
    const list = page.elements.rewardsContainer;
    assert.equal(results.dataset.searchState, 'results');
    assert.match(results.innerHTML, /Bio/);
    assert.doesNotMatch(results.innerHTML, /Bok/);
    assert.equal(list.dataset.rewardsState, 'ready');
    assert.equal(list.classList.contains('hidden'), true);
    assert.doesNotMatch(list.innerHTML, /Laddar belöningar/);
    assert.doesNotMatch(results.innerHTML, /Laddar belöningar/);
    await page.sandbox.onRewardSearch('Zzz');
    assert.equal(results.dataset.searchState, 'empty');
    assert.match(results.innerHTML, /Inga belöningar matchar "Zzz"/);
    assert.equal(list.dataset.rewardsState, 'ready');
  });

  it('keeps the latest search when an earlier request finishes late', async () => {
    const page = await bootRewards({
      payload: parentPayload([BIO, BOK]),
      standardRewards: [{ name: 'Biograf', icon: '🎬', star_cost: 20 }],
      standardDelay: 40,
    });
    const first = page.sandbox.onRewardSearch('B');
    const second = page.sandbox.onRewardSearch('Bio');
    await first;
    await second;
    const results = page.elements.rewardSearchResults;
    assert.equal(results.dataset.searchState, 'results');
    assert.match(results.innerHTML, /Bio/);
    assert.doesNotMatch(results.innerHTML, />Bok</);
    assert.doesNotMatch(results.innerHTML, /Söker…/);
    assert.equal(page.elements.rewardsContainer.dataset.rewardsState, 'ready');
  });

  it('at 390px hides bottom nav and FABs while the keyboard is open', () => {
    const css = read('public/css/app-layers.css');
    const observer = read('public/js/modal-open-observer.js');
    assert.match(css, /html\.keyboard-open \.parent-bottom-nav/);
    assert.match(css, /html\.keyboard-open #helpBtn/);
    assert.match(css, /html\.keyboard-open \.global-feedback-fab/);
    assert.match(observer, /keyboard-open/);
    assert.match(observer, /KEYBOARD_CHROME_INSET_PX = 120/);
    assert.doesNotMatch(css, /html\.keyboard-open[\s\S]*z-index/);
    const router = read('public/js/parent-magic-router.js');
    const rewardsStart = router.indexOf('rewards: [');
    const rewardsBlock = router.slice(rewardsStart, router.indexOf('],', rewardsStart));
    assert.ok(rewardsBlock.indexOf('reward-editor.js') < rewardsBlock.indexOf('rewards-hub.js'));
    const sv = JSON.parse(read('config/i18n/library-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/library-en-GB.json'));
    assert.equal(sv.empty.rewardsTitle, 'Inga belöningar ännu');
    assert.equal(sv.empty.addReward, '+ Ny belöning');
    assert.equal(sv.empty.noSearchReward, 'Inga belöningar matchar "{{query}}"');
    assert.equal(en.empty.rewardsTitle, 'No rewards yet');
    assert.equal(en.empty.noSearchReward, 'No rewards match "{{query}}"');
  });
});
