#!/usr/bin/env node
/**
 * generate-ambient-objects.mjs — Build browser pack from experience-pack JSON.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const JSON_IN = path.join(ROOT, 'config/experience-packs/child_se/ambient-objects.json');
const JS_OUT = path.join(ROOT, 'public/js/ambient-objects-pack.js');

function buildClientSource(pack) {
  return `/**
 * ambient-objects-pack.js — generated; do not edit by hand.
 * Regenerate: npm run generate:ambient-objects
 */
(function () {
  'use strict';

  var PACK = ${JSON.stringify(pack, null, 2)};

  function getScene(sceneId) {
    var scene = PACK.scenes[sceneId];
    if (!scene || !scene.objects) return [];
    return scene.objects.slice();
  }

  window.AmbientObjectsPack = {
    version: PACK.version,
    getScene: getScene,
    _raw: PACK,
  };
})();
`;
}

function readPack() {
  return JSON.parse(fs.readFileSync(JSON_IN, 'utf8'));
}

const pack = readPack();
const next = buildClientSource(pack);
const checkOnly = process.argv.includes('--check');

if (checkOnly) {
  if (!fs.existsSync(JS_OUT)) {
    console.error('missing', path.relative(ROOT, JS_OUT));
    process.exit(1);
  }
  const current = fs.readFileSync(JS_OUT, 'utf8');
  if (current !== next) {
    console.error('ambient-objects-pack.js is out of sync with ambient-objects.json');
    console.error('Run: npm run generate:ambient-objects');
    process.exit(1);
  }
  console.log('ambient-objects-pack.js is in sync');
  process.exit(0);
}

fs.writeFileSync(JS_OUT, next);
console.log('wrote', path.relative(ROOT, JS_OUT));
