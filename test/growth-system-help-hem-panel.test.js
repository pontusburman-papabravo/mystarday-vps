'use strict';

/**
 * Hem system-help wiring — ops signal: schema_no_child_login help never
 * appeared on Hem (?, inline CTA = 0) so families only saw it on other pages.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('Hem system-help panel (schema_no_child_login)', () => {
  it('refreshHelpPanel always asks the help_panel surface, not the page surface', () => {
    const src = read('public/js/growth-system-help.js');
    assert.match(src, /async function refreshHelpPanel/);
    assert.match(src, /const surface = 'help_panel'/);
    assert.doesNotMatch(
      src.slice(src.indexOf('async function refreshHelpPanel')),
      /detectSurface\(\)/
    );
  });

  it('schema_no_child_login may appear on Hem dashboard as well as the panel', () => {
    const { SURFACE_BY_BLOCKING_STEP } = require('../src/lib/growth-system-help');
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('help_panel'));
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('dashboard'));
    assert.ok(SURFACE_BY_BLOCKING_STEP.schema_no_child_login.includes('child_handoff'));
  });

  it('opening Hem ? mounts system help and skips the generic tip when eligible', async () => {
    const mount = {
      innerHTML: '',
      style: { display: 'none' },
      querySelector() { return null; },
    };
    const apiCalls = [];
    const helpJourneyTipCalls = [];
    const listeners = {};

    const sandbox = {
      console,
      Event,
      encodeURIComponent,
      URLSearchParams,
      sessionStorage: { getItem() { return null; }, setItem() {} },
      document: {
        getElementById(id) {
          if (id === 'helpJourneyTipMount') return mount;
          if (id === 'helpPanel') return { classList: { contains() { return true; }, toggle() {} } };
          return null;
        },
        createElement() {
          return { src: '', onload: null, onerror: null };
        },
        head: { appendChild(el) { if (el.onload) el.onload(); } },
        addEventListener(type, fn) {
          listeners[type] = listeners[type] || [];
          listeners[type].push(fn);
        },
        dispatchEvent(ev) {
          (listeners[ev.type] || []).forEach((fn) => fn(ev));
        },
        querySelectorAll() { return []; },
      },
      window: {},
      Auth: {
        api(url) {
          apiCalls.push(url);
          if (String(url).indexOf('/api/growth/system-help/context') !== -1) {
            assert.match(String(url), /surface=help_panel/);
            return Promise.resolve({
              eligible: true,
              blockingStep: 'schema_no_child_login',
              help: {
                headline: 'Öppna vyn för Astrid',
                body: 'Schemat är klart.',
                ctaLabel: 'Öppna barnets vy',
                ctaAction: 'start_child_login',
                helpType: 'preview_child_login_help',
              },
            });
          }
          return Promise.resolve({ ok: true });
        },
      },
      HelpJourneyTip: {
        refresh(el) { helpJourneyTipCalls.push(el); },
      },
    };
    sandbox.window = sandbox;
    sandbox.document.head.appendChild = function appendChild() {};

    vm.runInNewContext(read('public/js/growth-system-help.js'), sandbox, {
      filename: 'growth-system-help.js',
    });
    vm.runInNewContext(read('public/js/dashboard-tour.js'), sandbox, {
      filename: 'dashboard-tour.js',
    });

    sandbox.window.toggleHelpPanel();
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    assert.ok(apiCalls.some((url) => String(url).indexOf('surface=help_panel') !== -1));
    assert.match(mount.innerHTML, /Öppna vyn för Astrid/);
    assert.equal(helpJourneyTipCalls.length, 0);
  });
});
