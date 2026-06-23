#!/usr/bin/env node
/**
 * Smoke + mobile viewport QA for public marketing pages.
 * Usage: node scripts/landing-smoke-qa.mjs [baseUrl]
 */
const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const PAGES = [
  {
    path: '/',
    name: 'Startsida',
    mustHave: [
      'landing-hero',
      'id="problem"',
      'id="sa-fungerar-det"',
      'id="grundarprogram"',
      'data-track="hero_signup_click"',
      'landing.css',
      'landing-nav.js',
    ],
    mustNotHave: [
      'landingMatrixBody',
      'landing-program-matrix.js',
      'Logga in som barn',
      'Tipsa en familj',
      'id="kontaktForm"',
    ],
  },
  { path: '/kontakt', name: 'Kontakt', mustHave: ['contact-form', 'kontakt', 'landing.css'] },
  { path: '/faq', name: 'FAQ', mustHave: ['faq-page', 'faq-list', 'landing-faq.js'] },
  { path: '/register', name: 'Registrering', mustHave: ['Skapa ett föräldrakonto', '/register'] },
  { path: '/login', name: 'Login', mustHave: ['Logga in', 'noindex'] },
  { path: '/skattkammaren?demo=1', name: 'Skattkammaren demo', mustHave: ['Skattkammaren', 'demo'] },
  { path: '/pricing-info', name: 'Pricing info', mustHave: ['Så fungerar tillgången', 'pricing-info'] },
  { path: '/privacy', name: 'Integritet', mustHave: ['privacy', 'Integritet'] },
  { path: '/terms', name: 'Villkor', mustHave: ['terms', 'Villkor'] },
];

const API_CHECKS = [
  { path: '/health', expectJson: true, keys: ['status'] },
  { path: '/api/landing/stats', expectJson: true, keys: ['count', 'limit', 'spots_remaining'] },
];

let failed = 0;

async function fetchPage(path, mobile = true) {
  const res = await fetch(`${base}${path}`, {
    headers: mobile ? { 'User-Agent': MOBILE_UA } : {},
    redirect: 'follow',
  });
  const text = await res.text();
  return { res, text };
}

function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    failed += 1;
  }
}

console.log(`\n🔍 Smoke QA @ ${base} (mobile UA)\n`);

for (const page of PAGES) {
  console.log(`📄 ${page.name} (${page.path})`);
  try {
    const { res, text } = await fetchPage(page.path);
    check(`HTTP ${res.status}`, res.ok, String(res.status));
    for (const s of page.mustHave || []) {
      check(`contains "${s}"`, text.includes(s));
    }
    for (const s of page.mustNotHave || []) {
      check(`excludes "${s}"`, !text.includes(s));
    }
    if (page.path === '/') {
      check('__APP_MODE__ injected', text.includes('__APP_MODE__'));
      check('viewport meta', text.includes('width=device-width'));
    }
  } catch (err) {
    check('fetch', false, err.message);
  }
  console.log('');
}

console.log('🔌 API');
for (const api of API_CHECKS) {
  try {
    const { res, text } = await fetchPage(api.path);
    check(`${api.path} → ${res.status}`, res.ok);
    if (api.expectJson) {
      const data = JSON.parse(text);
      for (const k of api.keys) check(`${api.path} has ${k}`, k in data);
    } else {
      for (const s of api.mustHave) check(`${api.path} contains ${s}`, text.includes(s));
    }
  } catch (err) {
    check(api.path, false, err.message);
  }
}

console.log(`\n${failed === 0 ? '✅ All checks passed' : `❌ ${failed} check(s) failed`}\n`);
process.exit(failed ? 1 : 0);
