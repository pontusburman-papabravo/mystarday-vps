#!/usr/bin/env node
/**
 * Inject widget API base URL into capacitor-widget-bridge strings (R4.5e).
 * Survives cap sync — plugin sources are not regenerated.
 *
 * Usage: node scripts/patch-android-widget.mjs
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const stringsPath = path.join(
  ROOT,
  'plugins',
  'capacitor-widget-bridge',
  'android',
  'src',
  'main',
  'res',
  'values',
  'strings.xml'
);

const PLACEHOLDER = '__WIDGET_API_BASE_URL__';

function readServerUrlFromCapacitorConfig() {
  const capPath = path.join(ROOT, 'capacitor.config.ts');
  if (!fs.existsSync(capPath)) return '';
  const src = fs.readFileSync(capPath, 'utf8');
  const prodMatch = src.match(/url:\s*'([^']+)'/g);
  if (!prodMatch) return '';
  for (const m of prodMatch) {
    const inner = m.match(/url:\s*'([^']+)'/);
    const url = inner?.[1] || '';
    if (url.includes('localhost')) continue;
    if (url.startsWith('http')) return url.replace(/\/$/, '');
  }
  return '';
}

function resolveBaseUrl() {
  const fromEnv = process.env.WIDGET_API_BASE_URL || process.env.ANDROID_WIDGET_API_BASE_URL || '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  return readServerUrlFromCapacitorConfig();
}

if (!fs.existsSync(stringsPath)) {
  console.error('Not found:', stringsPath);
  process.exit(1);
}

const baseUrl = resolveBaseUrl();
let content = fs.readFileSync(stringsPath, 'utf8');

if (!baseUrl) {
  console.warn('Widget API base URL not resolved — leaving placeholder (set WIDGET_API_BASE_URL for release).');
  process.exit(0);
}

const escaped = baseUrl.replace(/&/g, '&amp;');
const replacement = `<string name="widget_api_base_url">${escaped}</string>`;
if (content.includes('name="widget_api_base_url"')) {
  content = content.replace(
    /<string name="widget_api_base_url">[^<]*<\/string>/,
    replacement
  );
} else {
  const closing = content.lastIndexOf('</resources>');
  content = content.slice(0, closing) + `    ${replacement}\n` + content.slice(closing);
}

fs.writeFileSync(stringsPath, content);
console.log('Patched widget_api_base_url in capacitor-widget-bridge strings.xml');
