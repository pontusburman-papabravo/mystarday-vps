'use strict';

/**
 * Runtime contract tests for schema_no_child_login inline handoff CTA.
 * Guards idempotency, flag-off rollback, and passive-hint path for other cohorts.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/js/growth-system-help.js'), 'utf8');

const SCHEMA_HELP = {
  headline: 'Hjälp barnet logga in',
  body: 'Schemat är klart. Låt barnet logga in med namn och PIN på samma enhet.',
  ctaLabel: 'Starta barninloggning',
  ctaAction: 'start_child_login',
  helpType: 'preview_child_login_help',
};

function makeClassList() {
  const set = new Set();
  return {
    add(cls) { set.add(cls); },
    contains(cls) { return set.has(cls); },
  };
}

function makeButton() {
  const attrs = {};
  const listeners = [];
  return {
    textContent: '',
    setAttribute(key, value) { attrs[key] = String(value); },
    getAttribute(key) { return attrs[key] == null ? null : attrs[key]; },
    addEventListener(type, fn, opts) {
      listeners.push({ type, fn, opts });
    },
    _listeners: listeners,
    click() {
      listeners
        .filter((l) => l.type === 'click')
        .forEach((l) => l.fn({ type: 'click' }));
    },
  };
}

function makeHandoffRoot(variant) {
  const classList = makeClassList();
  const primaryBtn = makeButton();
  const titleEl = { textContent: variant === 'magic' ? 'Magic title' : 'Legacy title' };
  const subEl = { textContent: variant === 'magic' ? 'Magic sub' : 'Legacy sub' };
  const actionsEl = { parentNode: null, nextSibling: null };
  const children = [];
  const root = {
    classList,
    _children: children,
    insertBefore(node, ref) {
      const idx = ref ? children.indexOf(ref) : children.length;
      children.splice(idx === -1 ? children.length : idx, 0, node);
    },
    querySelector(sel) {
      if (sel.includes('title')) return titleEl;
      if (sel.includes('sub')) return subEl;
      if (sel.includes('dashboardChildLoginBtn') || sel.includes('child-login')) return primaryBtn;
      if (sel.includes('actions')) return actionsEl;
      if (sel.includes('handoff-secondary')) {
        return children.find((c) => c.className && c.className.includes('handoff-secondary')) || null;
      }
      if (sel.includes('growth-system-help-inline')) {
        return children.find((c) => c.className && c.className.includes('growth-system-help-inline')) || null;
      }
      return null;
    },
    appendChild(el) {
      children.push(el);
    },
  };
  actionsEl.parentNode = root;
  actionsEl.nextSibling = null;
  return { root, primaryBtn, titleEl, subEl, children };
}

function loadGrowthSystemHelp(options) {
  options = options || {};
  const storage = {};
  const tracked = [];
  const apiCalls = [];

  const sandbox = {
    console,
    encodeURIComponent,
    URLSearchParams,
    sessionStorage: {
      getItem(key) { return storage[key] == null ? null : storage[key]; },
      setItem(key, value) { storage[key] = String(value); },
    },
    document: {
      createElement(tag) {
        const el = {
          tagName: tag,
          type: 'button',
          className: '',
          textContent: '',
          disabled: false,
          addEventListener() {},
        };
        return el;
      },
      head: { appendChild() {} },
    },
    window: {},
    analytics: {
      track(_familyId, eventType, metadata) {
        tracked.push({ eventType, metadata });
      },
    },
    Auth: {
      api(url, opts) {
        apiCalls.push({ url, opts });
        if (url.indexOf('/api/growth/system-help/context') !== -1) {
          if (options.contextResponse === undefined) {
            return Promise.resolve({
              eligible: true,
              blockingStep: 'schema_no_child_login',
              help: SCHEMA_HELP,
            });
          }
          return Promise.resolve(options.contextResponse);
        }
        if (url.indexOf('/api/growth/system-help/shown') !== -1) {
          return Promise.resolve({ ok: true });
        }
        return Promise.resolve({ ok: true });
      },
    },
    DashboardChildHandoff: {
      startChildLogin() {},
    },
  };
  sandbox.window = sandbox;

  vm.runInNewContext(SRC, sandbox, { filename: 'growth-system-help.js' });
  return {
    GrowthSystemHelp: sandbox.GrowthSystemHelp,
    tracked,
    apiCalls,
    storage,
  };
}

describe('growth handoff inline CTA — runtime contracts', () => {
  it('schema_no_child_login enriches copy, secondary link, and tracks shown once per session', async () => {
    const { GrowthSystemHelp, tracked } = loadGrowthSystemHelp();
    const legacy = makeHandoffRoot('legacy');
    const magic = makeHandoffRoot('magic');

    await GrowthSystemHelp.enrichHandoff(legacy.root);
    await GrowthSystemHelp.enrichHandoff(magic.root);

    assert.equal(legacy.titleEl.textContent, SCHEMA_HELP.headline);
    assert.equal(magic.titleEl.textContent, SCHEMA_HELP.headline);
    assert.equal(legacy.primaryBtn.textContent, SCHEMA_HELP.ctaLabel);
    assert.equal(
      legacy.children.filter((c) => c.className.includes('handoff-secondary')).length,
      1
    );
    assert.equal(
      magic.children.filter((c) => c.className.includes('handoff-secondary')).length,
      1
    );

    const shown = tracked.filter((e) => e.eventType === 'handoff_inline_cta_shown');
    assert.equal(shown.length, 1);
    assert.equal(shown[0].metadata.blocking_step, 'schema_no_child_login');
    assert.equal(shown[0].metadata.cohort, 'schema_no_child_login');
    assert.equal(shown[0].metadata.help_type, SCHEMA_HELP.helpType);
  });

  it('re-enrich refreshes copy after postSchema i18n overwrite without duplicate listeners', async () => {
    const { GrowthSystemHelp, tracked } = loadGrowthSystemHelp();
    const { root, titleEl, primaryBtn, children } = makeHandoffRoot('magic');

    await GrowthSystemHelp.enrichHandoff(root);
    titleEl.textContent = 'Låt barnet testa sin rutin';
    primaryBtn.textContent = 'Öppna barnets vy';
    await GrowthSystemHelp.enrichHandoff(root);

    assert.equal(titleEl.textContent, SCHEMA_HELP.headline);
    assert.equal(primaryBtn.textContent, SCHEMA_HELP.ctaLabel);
    assert.equal(primaryBtn._listeners.length, 1);
    assert.equal(children.filter((c) => c.className.includes('handoff-secondary')).length, 1);
    assert.equal(tracked.filter((e) => e.eventType === 'handoff_inline_cta_shown').length, 1);
  });

  it('maybeEnrichHandoff idempotent — no duplicate listeners, links, or shown events', async () => {
    const { GrowthSystemHelp, tracked, apiCalls } = loadGrowthSystemHelp();
    const { root, primaryBtn, children } = makeHandoffRoot('legacy');

    await GrowthSystemHelp.enrichHandoff(root);
    await GrowthSystemHelp.enrichHandoff(root);
    await GrowthSystemHelp.enrichHandoff(root);

    assert.equal(primaryBtn._listeners.length, 1);
    assert.equal(children.filter((c) => c.className.includes('handoff-secondary')).length, 1);
    assert.equal(tracked.filter((e) => e.eventType === 'handoff_inline_cta_shown').length, 1);

    primaryBtn.click();
    await Promise.resolve();
    primaryBtn.click();
    await Promise.resolve();
    assert.equal(tracked.filter((e) => e.eventType === 'handoff_inline_cta_clicked').length, 2);
    tracked
      .filter((e) => e.eventType === 'handoff_inline_cta_clicked')
      .forEach((e) => {
        assert.equal(e.metadata.blocking_step, 'schema_no_child_login');
        assert.equal(e.metadata.help_type, SCHEMA_HELP.helpType);
      });

    const engageCalls = apiCalls.filter((c) => String(c.url).indexOf('/api/growth/system-help/engage') !== -1);
    assert.equal(engageCalls.length, 1);
    const engageBody = JSON.parse(engageCalls[0].opts.body);
    assert.equal(engageBody.surface, 'child_handoff');
    assert.equal(engageBody.blocking_step, 'schema_no_child_login');
    assert.equal(engageBody.cta_action, SCHEMA_HELP.ctaAction);
  });

  it('flag off / ineligible context leaves handoff copy unchanged (rollback path)', async () => {
    const { GrowthSystemHelp, tracked } = loadGrowthSystemHelp({
      contextResponse: { eligible: false, reason: 'flag_off' },
    });
    const { root, titleEl, subEl, primaryBtn, children } = makeHandoffRoot('legacy');
    const beforeTitle = titleEl.textContent;
    const beforeSub = subEl.textContent;
    const beforeBtn = primaryBtn.textContent;

    await GrowthSystemHelp.enrichHandoff(root);

    assert.equal(titleEl.textContent, beforeTitle);
    assert.equal(subEl.textContent, beforeSub);
    assert.equal(primaryBtn.textContent, beforeBtn);
    assert.equal(children.length, 0);
    assert.equal(tracked.length, 0);
    assert.equal(primaryBtn._listeners.length, 0);
  });

  it('other blocking steps keep passive help link and never inline system-help copy', async () => {
    const { GrowthSystemHelp, tracked } = loadGrowthSystemHelp({
      contextResponse: {
        eligible: true,
        blockingStep: 'login_no_completion',
        help: {
          headline: 'Första stjärnan väntar',
          body: 'Barnet har loggat in',
          ctaLabel: 'Öppna dagens schema',
          ctaAction: 'open_daily_log',
          helpType: 'preview_first_star_guide',
        },
      },
    });
    const { root, titleEl, subEl, primaryBtn, children } = makeHandoffRoot('magic');
    const beforeTitle = titleEl.textContent;

    await GrowthSystemHelp.enrichHandoff(root);
    await GrowthSystemHelp.enrichHandoff(root);

    assert.equal(titleEl.textContent, beforeTitle);
    assert.notEqual(subEl.textContent, SCHEMA_HELP.body);
    assert.notEqual(primaryBtn.textContent, SCHEMA_HELP.ctaLabel);
    assert.equal(primaryBtn.getAttribute('data-handoff-inline-click-bound'), null);
    assert.equal(children.filter((c) => c.className.includes('handoff-secondary')).length, 0);
    assert.equal(children.filter((c) => c.className.includes('growth-system-help-inline')).length, 1);
    assert.equal(tracked.filter((e) => e.eventType === 'handoff_inline_cta_shown').length, 0);
    assert.equal(tracked.filter((e) => e.eventType === 'handoff_inline_cta_clicked').length, 0);
  });
});
