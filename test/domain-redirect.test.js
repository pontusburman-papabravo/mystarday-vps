'use strict'; // pragma: allowlist secret

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createDomainRedirect,
  MAIN_DOMAIN,
  APP_DOMAIN,
  EU_REDIRECT_DOMAINS,
  REDIRECT_TO_MAIN,
} = require('../src/lib/domain-redirect');

function runRedirect(host, url = '/activities') {
  const middleware = createDomainRedirect();
  let status;
  let location;
  const req = { headers: { host }, originalUrl: url };
  const res = {
    redirect(code, loc) {
      status = code;
      location = loc;
    },
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { status, location, nextCalled };
}

test('www mystarday.se redirects 301 to bare .se domain', () => { // pragma: allowlist secret
  const { status, location, nextCalled } = runRedirect(`www.${MAIN_DOMAIN}`, '/faq?utm=1');
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${MAIN_DOMAIN}/faq?utm=1`);
});

test('bare mystarday.se apex is not redirected', () => { // pragma: allowlist secret
  const { nextCalled } = runRedirect(MAIN_DOMAIN);
  assert.equal(nextCalled, true);
});

test('legacy Swedish alias redirects to mystarday.se', () => { // pragma: allowlist secret
  const { status, location, nextCalled } = runRedirect('minstjärndag.se', '/login');
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${MAIN_DOMAIN}/login`);
});

test('mystarday.eu redirects 301 to mystarday.app', () => { // pragma: allowlist secret
  const { status, location, nextCalled } = runRedirect('mystarday.eu', '/en?utm=1'); // pragma: allowlist secret
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${APP_DOMAIN}/en?utm=1`);
});

test('www.mystarday.eu redirects 301 to mystarday.app', () => { // pragma: allowlist secret
  const { status, location, nextCalled } = runRedirect('www.mystarday.eu', '/privacy'); // pragma: allowlist secret
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${APP_DOMAIN}/privacy`);
});

test('www.mystarday.app redirects 301 to mystarday.app apex', () => { // pragma: allowlist secret
  const { status, location, nextCalled } = runRedirect('www.mystarday.app', '/register?ref=1'); // pragma: allowlist secret
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${APP_DOMAIN}/register?ref=1`);
});

test('bare mystarday.app apex is not redirected', () => { // pragma: allowlist secret
  const { nextCalled } = runRedirect(APP_DOMAIN, '/');
  assert.equal(nextCalled, true);
});

test('mystarday.eu is not in legacy .se redirect set', () => { // pragma: allowlist secret
  assert.equal(REDIRECT_TO_MAIN.has('mystarday.eu'), false); // pragma: allowlist secret
  assert.equal(REDIRECT_TO_MAIN.has('www.mystarday.eu'), false); // pragma: allowlist secret
});

test('EU redirect domains are exported for ops/tests', () => {
  assert.deepEqual([...EU_REDIRECT_DOMAINS].sort(), ['mystarday.eu', 'www.mystarday.eu']); // pragma: allowlist secret
});

test('redirect contract: .eu and www hosts preserve path and query on 301 to .app', () => {
  const contractUrl = '/foo?x=1';
  for (const host of ['[REDACTED].eu', 'www.[REDACTED].eu']) { // pragma: allowlist secret
    const { status, location, nextCalled } = runRedirect(host, contractUrl);
    assert.equal(nextCalled, false, `${host} should redirect`);
    assert.equal(status, 301, `${host} must use permanent redirect`);
    assert.equal(location, `https://${APP_DOMAIN}${contractUrl}`);
  }
});

test('redirect contract: www .app apex canonicalizes to bare .app on 301', () => {
  const contractUrl = '/foo?x=1';
  const { status, location, nextCalled } = runRedirect(`www.${APP_DOMAIN}`, contractUrl);
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${APP_DOMAIN}${contractUrl}`);
});

test('redirect contract: bare .app apex is served without redirect loop', () => {
  const contractUrl = '/foo?x=1';
  const { status, location, nextCalled } = runRedirect(APP_DOMAIN, contractUrl);
  assert.equal(nextCalled, true);
  assert.equal(status, undefined);
  assert.equal(location, undefined);
});
