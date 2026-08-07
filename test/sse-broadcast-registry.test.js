'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { EVENT_SCOPE } = require('../src/lib/sse-event-scope');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walkJs(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const abs = path.join(dir, name);
    const st = fs.statSync(abs);
    if (st.isDirectory()) walkJs(abs, out);
    else if (name.endsWith('.js')) out.push(abs);
  }
}

function collectBroadcastEventTypes() {
  const re = /broadcast\s*\(\s*[^,]+,\s*['"]([A-Z][A-Z0-9_]+)['"]/g;
  const types = new Set();
  const files = [];
  walkJs(SRC, files);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let m;
    while ((m = re.exec(text)) !== null) {
      types.add(m[1]);
    }
  }
  return types;
}

test('every server broadcast() event type is registered in EVENT_SCOPE', () => {
  const emitted = collectBroadcastEventTypes();
  const missing = [...emitted].filter((t) => !Object.prototype.hasOwnProperty.call(EVENT_SCOPE, t));
  assert.deepEqual(missing, [], `missing from EVENT_SCOPE: ${missing.join(', ')}`);
});

test('UNKNOWN_EVENT broadcast is not delivered to clients', () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production'; // pragma: allowlist secret
  try {
    const { broadcast, addClient } = require('../src/lib/sse-broadcast');
    let writes = 0;
    const res = {
      write() {
        writes += 1;
      },
      end() {},
    };
    addClient('00000000-0000-4000-8000-000000000099', res, {
      shouldDeliver: () => true,
    });
    broadcast('00000000-0000-4000-8000-000000000099', 'UNKNOWN_EVENT', { childId: 'x' });
    assert.equal(writes, 0);
  } finally {
    process.env.NODE_ENV = prev;
  }
});
