'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/smoke-landing-mobile.mjs');

function runNodeScript(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
    child.on('error', reject);
  });
}

test('landing mobile browser script exists', () => {
  const fs = require('fs');
  assert.ok(fs.existsSync(SCRIPT));
  const src = fs.readFileSync(SCRIPT, 'utf8');
  assert.match(src, /navHamburger/);
  assert.match(src, /faq-item/);
  assert.match(src, /contactForm/);
});

test('landing mobile browser smoke', { timeout: 120_000 }, async (t) => {
  if (process.env.SKIP_BROWSER_TESTS === '1') {
    t.skip('SKIP_BROWSER_TESTS=1');
  }

  const base = process.env.BASE || 'http://127.0.0.1:3000';
  const { code, stdout, stderr } = await runNodeScript(SCRIPT, {
    BASE: base,
    HEADLESS: '1',
  });

  if (code !== 0) {
    console.error(stderr || stdout);
  }
  assert.equal(code, 0, `browser smoke failed — see output above (BASE=${base})`);
  assert.match(stdout, /hamburger visible on mobile/);
  assert.match(stdout, /FAQ expands on tap/);
});
