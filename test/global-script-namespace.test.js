'use strict';

/**
 * Guards against classic-script global leaks (see onboarding window.ot P0).
 * Top-level `function ot()` in a non-IIFE file becomes window.ot in browsers.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const JS_ROOT = path.join(ROOT, 'public/js');

const I18N_COLLISION_NAMES = new Set(['ot', 'onboardingPlural', 't', 'translate']);
const OTHER_RISKY_NAMES = new Set(['init', 'render', 'p']);

function listJsFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...listJsFiles(p));
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

function isModuleOrIife(src) {
  const head = src.slice(0, 600);
  return /^\s*\(function/m.test(head) || /^\s*export\s/m.test(head.slice(0, 200));
}

function topLevelFunctions(src) {
  const names = [];
  const re = /^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;
  let m;
  while ((m = re.exec(src))) {
    names.push({ name: m[1], line: src.slice(0, m.index).split('\n').length });
  }
  return names;
}

test('public/js: no i18n collision names as top-level functions in classic scripts', () => {
  const violations = [];
  for (const file of listJsFiles(JS_ROOT)) {
    const rel = path.relative(ROOT, file);
    const src = fs.readFileSync(file, 'utf8');
    if (isModuleOrIife(src)) continue;
    for (const { name, line } of topLevelFunctions(src)) {
      if (I18N_COLLISION_NAMES.has(name)) {
        violations.push(`${rel}:${line} function ${name}`);
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `Top-level i18n helper names leak to window in classic scripts:\n${violations.join('\n')}`
  );
});

test('onboarding.js must not declare top-level ot or onboardingPlural', () => {
  const src = fs.readFileSync(path.join(JS_ROOT, 'onboarding.js'), 'utf8');
  assert.doesNotMatch(src, /^\s*function\s+ot\s*\(/m);
  assert.doesNotMatch(src, /^\s*function\s+onboardingPlural\s*\(/m);
});
