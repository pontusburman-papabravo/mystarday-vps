'use strict';

/**
 * Copy config/locale-catalog.json into the client mirror in public/js/i18n.js.
 * Adding a language: edit the JSON, run this script, add the locale file, run tests.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const catalogPath = path.join(ROOT, 'config', 'locale-catalog.json');
const clientPath = path.join(ROOT, 'public', 'js', 'i18n.js');
const START = '  // BEGIN LOCALE_CATALOG';
const END = '  // END LOCALE_CATALOG';

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const src = fs.readFileSync(clientPath, 'utf8');
const start = src.indexOf(START);
const end = src.indexOf(END);
if (start === -1 || end === -1 || end < start) {
  console.error('[sync-locale-catalog] markers missing in public/js/i18n.js');
  process.exit(1);
}

const body = `  // BEGIN LOCALE_CATALOG\n  CATALOG: ${JSON.stringify(catalog, null, 2).replace(/\n/g, '\n  ')},\n  `;
const next = src.slice(0, start) + body + src.slice(end);
fs.writeFileSync(clientPath, next);
console.log('[sync-locale-catalog] updated public/js/i18n.js from config/locale-catalog.json');
