/**
 * xss.test.js — Tests that child names with script tags are treated as text.
 *
 * Tests the actual escapeHtml() from public/js/dom-utils.js via sandbox evaluation.
 * Verifies that any HTML content in user-provided names would need to be
 * escaped before rendering.
 */

'use strict';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

// ─── Load actual escapeHtml from dom-utils.js via sandbox ──────────────────
const DOM_UTILS = path.join(__dirname, '..', 'public', 'js', 'dom-utils.js');

let escapeHtml;

before(() => {
  const src = fs.readFileSync(DOM_UTILS, 'utf8');
  // Sandbox: acts as window/globalThis so the IIFE sets root.escapeHtml = escapeHtml
  const sandbox = {};
  const wrapped = '(function(window){ ' + src + ' })(sandbox)';
  // eslint-disable-next-line no-new-func
  const fn = new Function('sandbox', wrapped);
  fn(sandbox);
  escapeHtml = sandbox.escapeHtml;
  assert.ok(typeof escapeHtml === 'function', 'dom-utils.js must export escapeHtml as a function');
});

// ─── Tests ──────────────────────────────────────────────────────────────────

test('child name with <script> tag is escaped to safe text', () => {
  const maliciousName = '<script>alert("xss")</script>';
  const escaped = escapeHtml(maliciousName);

  assert.ok(!escaped.includes('<script>'), 'Escaped output should not contain <script>');
  assert.ok(escaped.includes('&lt;script&gt;'), 'Script tags should be converted to &lt;/&gt; entities');
});

test('child name with img onerror tag is escaped to inert text', () => {
  const maliciousName = '<img src=x onerror=alert(1)>';
  const escaped = escapeHtml(maliciousName);

  // The < and > are escaped to entities — browser won't parse this as an HTML tag
  assert.ok(!escaped.includes('<img'), 'Escaped output should not contain <img literal tag');
  assert.ok(escaped.includes('&lt;img'), 'Should contain &lt;img — angle bracket escaped');
  assert.ok(!escaped.includes('<img'), 'No unescaped opening tag in output');
});

test('child name with normal Swedish characters is not altered', () => {
  const normalName = 'Åsa Björk';
  const escaped = escapeHtml(normalName);
  assert.equal(escaped, 'Åsa Björk', 'Normal Swedish name should be unchanged');
});

test('child name with emoji is not altered', () => {
  const emojiName = 'Lille Max 🌟';
  const escaped = escapeHtml(emojiName);
  assert.equal(escaped, 'Lille Max 🌟', 'Emoji in name should be preserved');
});

test('empty child name returns empty string', () => {
  const escaped = escapeHtml('');
  assert.equal(escaped, '', 'Empty name should produce empty output');
});

test('null input returns empty string', () => {
  const escaped = escapeHtml(null);
  assert.equal(escaped, '', 'null should produce empty output');
});

test('undefined input returns empty string', () => {
  const escaped = escapeHtml(undefined);
  assert.equal(escaped, '', 'undefined should produce empty output');
});

test('number input is coerced to string', () => {
  const escaped = escapeHtml(42);
  assert.equal(escaped, '42', 'Number should be coerced to string');
});

test('onboarding.js escapes childName and groupMeta.name before innerHTML', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'onboarding.js'), 'utf8');
  assert.match(
    src,
    /introPara\.textContent = tOnboarding\('onboarding\.rewards\.introWithCount'/,
    'step 4 reward intro must use textContent + tOnboarding()',
  );
  assert.match(
    src,
    /subtitleEl\.textContent = tOnboarding\('onboarding\.scheduleReady\.subtitleWithTemplate'/,
    'step 3 subtitle must use textContent + tOnboarding() with templateName and childName',
  );
  assert.doesNotMatch(
    src,
    /subtitleEl\.innerHTML[\s\S]*\$\{childName\}/,
    'step 3 subtitle must not interpolate childName into innerHTML',
  );
  assert.match(src, /escapeHtml\(reward\.name\)/);
  assert.match(src, /escapeHtml\(reward\.icon\)/);
});

test('child name with SVG injection attempt is escaped', () => {
  const maliciousName = '<svg onload=alert(1)>';
  const escaped = escapeHtml(maliciousName);
  assert.ok(!escaped.includes('<svg'), 'SVG tag should not appear unescaped');
  assert.ok(escaped.includes('&lt;svg'), 'SVG tag should be escaped to &lt;svg');
});