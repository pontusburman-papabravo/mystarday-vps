'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const ACCOUNT_SRC = fs.readFileSync(path.join(ROOT, 'public/js/settings-account.js'), 'utf8');

const PROMPTS = {
  'settings.account.unlinkApplePrompt': 'Ange ditt lösenord för att koppla bort Apple:',
  'settings.account.unlinkGooglePrompt': 'Ange ditt lösenord för att koppla bort Google:',
  'settings.account.removing': 'Tar bort…',
  'settings.account.unlinkApple': 'Koppla bort Apple-konto',
  'settings.account.unlinkGoogle': 'Koppla bort Google-konto',
};

function translate(key) {
  return PROMPTS[key] || key;
}

let registry;

function makeInteractiveEl(id, opts) {
  opts = opts || {};
  const listeners = [];
  const el = {
    id,
    tagName: opts.tagName || 'div',
    disabled: false,
    _text: opts.text || '',
    _classes: new Set(opts.hidden ? ['hidden'] : []),
    _listeners: listeners,
    classList: {
      add(c) { el._classes.add(c); },
      remove(c) { el._classes.delete(c); },
      contains(c) { return el._classes.has(c); },
      toggle(c, on) {
        if (on === undefined) {
          if (el._classes.has(c)) el._classes.delete(c);
          else el._classes.add(c);
        } else if (on) el._classes.add(c);
        else el._classes.delete(c);
      },
    },
    addEventListener(type, fn) {
      if (type === 'click' || type === 'submit') listeners.push(fn);
    },
    click() {
      return Promise.all(listeners.map((fn) => Promise.resolve(fn({ preventDefault() {} }))));
    },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    reset() {},
  };
  Object.defineProperty(el, 'textContent', {
    get() { return el._text; },
    set(v) { el._text = String(v == null ? '' : v); },
    configurable: true,
  });
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) {
      el._html = String(v || '');
      if (el._html.includes('id="unlinkAppleBtn"')) {
        registry.unlinkAppleBtn = makeInteractiveEl('unlinkAppleBtn', { tagName: 'button' });
        registry.unlinkAppleMsg = makeInteractiveEl('unlinkAppleMsg', { tagName: 'p' });
      }
      if (el._html.includes('id="unlinkGoogleBtn"')) {
        registry.unlinkGoogleBtn = makeInteractiveEl('unlinkGoogleBtn', { tagName: 'button' });
        registry.unlinkGoogleMsg = makeInteractiveEl('unlinkGoogleMsg', { tagName: 'p' });
      }
      if (el._html.includes('id="changePasswordForm"')) {
        registry.changePasswordForm = makeInteractiveEl('changePasswordForm', { tagName: 'form' });
      }
    },
    configurable: true,
  });
  return el;
}

function makeAccountSandbox(meResponse) {
  registry = {};
  const apiCalls = [];
  const promptCalls = [];

  const accountSection = makeInteractiveEl('accountSection', { tagName: 'section' });
  registry.accountSection = accountSection;
  registry.legacyPasswordSection = makeInteractiveEl('legacyPasswordSection', { hidden: true });

  const sandbox = {
    console: { error() {}, warn() {} },
    setTimeout(fn) { fn(); return 0; },
    clearTimeout() {},
    alert() {},
    prompt(msg) {
      promptCalls.push(msg);
      return 'test-password-42';
    },
    I18n: { t(key) { return translate(key); } },
    Auth: {
      api(url, opts) {
        apiCalls.push({ url, opts });
        if (url === '/api/auth/me') return Promise.resolve(meResponse);
        if (url === '/api/account/unlink-apple' || url === '/api/account/unlink-google') {
          return Promise.resolve({ ok: true });
        }
        return Promise.reject(new Error('unexpected api: ' + url));
      },
    },
    Platform: {
      isIOS() { return false; },
      isGoogleSignInAvailable() { return true; },
    },
    AuthLoginPlatform: {
      getAuthMethods() { return { google: true }; },
    },
    document: {
      getElementById(id) { return registry[id] || null; },
      addEventListener() {},
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.window.pt = function parentPt(key) { return translate(key); };

  vm.runInNewContext(ACCOUNT_SRC, sandbox, { filename: 'settings-account.js' });

  return { sandbox, apiCalls, promptCalls };
}

async function initAndClickUnlink(meResponse, buttonId) {
  const ctx = makeAccountSandbox(meResponse);
  await ctx.sandbox.initAccountSection();
  const btn = ctx.sandbox.document.getElementById(buttonId);
  assert.ok(btn, buttonId + ' must exist after initAccountSection');
  await btn.click();
  return ctx;
}

describe('settings-account unlink handlers (behavioral)', () => {
  it('Apple unlink invokes prompt(settingsAccountPt) and DELETE /api/account/unlink-apple', async () => {
    const me = {
      accountAuth: {
        hasPassword: true,
        hasAppleLinked: true,
        canUnlinkApple: true,
        hasGoogleLinked: false,
      },
    };
    const ctx = await initAndClickUnlink(me, 'unlinkAppleBtn');

    assert.equal(ctx.promptCalls.length, 1);
    assert.equal(ctx.promptCalls[0], PROMPTS['settings.account.unlinkApplePrompt']);
    assert.doesNotMatch(ACCOUNT_SRC, /promsettingsAccountPt/);

    const unlinkCall = ctx.apiCalls.find((c) => c.url === '/api/account/unlink-apple');
    assert.ok(unlinkCall, 'unlink-apple API must be called');
    assert.equal(unlinkCall.opts.method, 'DELETE');
    assert.deepEqual(JSON.parse(unlinkCall.opts.body), { password: 'test-password-42' });
    assert.equal(ctx.apiCalls.filter((c) => c.url === '/api/auth/me').length, 2);
  });

  it('Google unlink invokes prompt(settingsAccountPt) and DELETE /api/account/unlink-google', async () => {
    const me = {
      accountAuth: {
        hasPassword: true,
        hasGoogleLinked: true,
        canUnlinkGoogle: true,
        hasAppleLinked: false,
      },
    };
    const ctx = await initAndClickUnlink(me, 'unlinkGoogleBtn');

    assert.equal(ctx.promptCalls.length, 1);
    assert.equal(ctx.promptCalls[0], PROMPTS['settings.account.unlinkGooglePrompt']);

    const unlinkCall = ctx.apiCalls.find((c) => c.url === '/api/account/unlink-google');
    assert.ok(unlinkCall, 'unlink-google API must be called');
    assert.equal(unlinkCall.opts.method, 'DELETE');
    assert.deepEqual(JSON.parse(unlinkCall.opts.body), { password: 'test-password-42' });
    assert.equal(ctx.apiCalls.filter((c) => c.url === '/api/auth/me').length, 2);
  });

  it('Apple unlink aborts cleanly when prompt returns empty', async () => {
    const me = {
      accountAuth: {
        hasPassword: true,
        hasAppleLinked: true,
        canUnlinkApple: true,
        hasGoogleLinked: false,
      },
    };
    const ctx = makeAccountSandbox(me);
    ctx.sandbox.prompt = function () { ctx.promptCalls.push('called'); return ''; };
    await ctx.sandbox.initAccountSection();
    const btn = ctx.sandbox.document.getElementById('unlinkAppleBtn');
    await btn.click();
    assert.equal(ctx.promptCalls.length, 1);
    assert.equal(ctx.apiCalls.some((c) => c.url === '/api/account/unlink-apple'), false);
    assert.equal(btn.disabled, false);
  });
});
