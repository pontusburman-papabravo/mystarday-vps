const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function walkHtml(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkHtml(p));
    else if (ent.name.endsWith('.html')) out.push(p);
  }
  return out;
}

describe('Fas 9 Tailwind build pipeline', () => {
  it('no public HTML references Tailwind CDN', () => {
    for (const file of walkHtml(path.join(ROOT, 'public'))) {
      const html = read(path.relative(ROOT, file));
      assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, `${file} must not use Tailwind CDN`);
      assert.doesNotMatch(html, /tailwind\.config\s*=/, `${file} must not inline tailwind.config`);
    }
  });

  it('tailwind.build.css exists and includes custom theme utilities', () => {
    const css = read('public/css/tailwind.build.css');
    assert.ok(css.length > 10_000, 'built CSS should be substantial');
    assert.match(css, /\.text-navy\b/, 'custom color text-navy');
    assert.match(css, /\.bg-gold\b/, 'custom color bg-gold');
    assert.match(css, /\.font-heading\b/, 'custom font-heading');
  });

  it('CACHE_NAME matches config/cache-version.json', () => {
    const { cacheName } = JSON.parse(read('config/cache-version.json'));
    const sw = read('public/sw.js');
    assert.match(sw, new RegExp(`const CACHE_NAME = '${cacheName}'`));
  });

  it('tailwind.build.css is precached in service worker', () => {
    const sw = read('public/sw.js');
    assert.match(sw, /\/css\/tailwind\.build\.css/);
  });

  it('CSP no longer allows cdn.tailwindcss.com', () => {
    const headers = read('src/middleware/securityHeaders.js');
    assert.doesNotMatch(headers, /cdn\.tailwindcss\.com/);
  });

  it('npm run css:build produces deterministic output', () => {
    const tailwindBin = path.join(ROOT, 'node_modules', '.bin', 'tailwindcss');
    if (!fs.existsSync(tailwindBin)) {
      return; // devDependency not installed — CI installs it via npm ci
    }
    const before = read('public/css/tailwind.build.css');
    execSync('node scripts/css-build.mjs', {
      cwd: ROOT,
      stdio: 'pipe',
      env: { ...process.env, PATH: `${path.dirname(tailwindBin)}:${process.env.PATH || ''}` },
    });
    const after = read('public/css/tailwind.build.css');
    assert.equal(before, after, 'committed tailwind.build.css must match fresh build');
  });
});
