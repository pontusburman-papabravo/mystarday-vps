'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDomainRedirect, MAIN_DOMAIN } = require('../src/lib/domain-redirect');

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

test('www apex host redirects 301 to bare domain', () => {
  const { status, location, nextCalled } = runRedirect(`www.${MAIN_DOMAIN}`, '/faq?utm=1');
  assert.equal(nextCalled, false);
  assert.equal(status, 301);
  assert.equal(location, `https://${MAIN_DOMAIN}/faq?utm=1`);
});

test('bare apex host is not redirected', () => {
  const { nextCalled } = runRedirect(MAIN_DOMAIN);
  assert.equal(nextCalled, true);
});
