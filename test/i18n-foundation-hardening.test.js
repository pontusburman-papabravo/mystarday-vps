'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { createApp } = require('../app');
const {
  normalizeLocale,
  validateLocale,
  resolvePreAuthLocale,
  experiencePackIdForLocale,
  DEFAULT_LOCALE,
} = require('../src/lib/locale');
const {
  resolveVerificationEmailLocale,
  resolvePasswordResetEmailLocale,
} = require('../src/lib/auth-email-locale');
const { loadLocales, getLocale } = require('../src/lib/i18n');

describe('locale backward compatibility matrix', () => {
  const cases = [
    ['sv', 'sv-SE'],
    ['sv-SE', 'sv-SE'],
    ['sv_se', 'sv-SE'],
    ['en', 'en-GB'],
    ['en-GB', 'en-GB'],
    ['en_gb', 'en-GB'],
    ['', null],
    [null, null],
    ['fr-FR', null],
  ];

  for (const [input, expected] of cases) {
    it(`normalizeLocale(${JSON.stringify(input)}) → ${JSON.stringify(expected)}`, () => {
      assert.equal(normalizeLocale(input), expected);
    });
  }

  it('validateLocale maps empty and bogus to sv-SE', () => {
    assert.equal(validateLocale(''), DEFAULT_LOCALE);
    assert.equal(validateLocale('bogus'), DEFAULT_LOCALE);
  });
});

describe('experience pack gating', () => {
  it('en-GB without english_child_experience stays on child_se', () => {
    assert.equal(experiencePackIdForLocale('en-GB'), 'child_se');
    assert.equal(experiencePackIdForLocale('en-GB', { englishChildExperienceEnabled: false }), 'child_se');
  });

  it('en-GB with english_child_experience may use child_en', () => {
    assert.equal(
      experiencePackIdForLocale('en-GB', { englishChildExperienceEnabled: true }),
      'child_en'
    );
  });

  it('sv-SE always uses child_se', () => {
    assert.equal(experiencePackIdForLocale('sv-SE', { englishChildExperienceEnabled: true }), 'child_se');
  });
});

describe('auth email locale resolution', () => {
  it('verification uses family locale from registration', () => {
    assert.equal(resolveVerificationEmailLocale('en-GB'), 'en-GB');
    assert.equal(resolveVerificationEmailLocale('sv-SE'), 'sv-SE');
    assert.equal(resolveVerificationEmailLocale('sv'), 'sv-SE');
  });

  it('password reset prefers explicit request locale over family', () => {
    assert.equal(resolvePasswordResetEmailLocale({
      familyPreferredLocale: 'en-GB',
      requestLocale: 'sv-SE',
    }), 'sv-SE');
    assert.equal(resolvePasswordResetEmailLocale({
      familyPreferredLocale: 'sv-SE',
      requestLocale: 'en',
    }), 'en-GB');
  });

  it('password reset falls back to family then sv-SE', () => {
    assert.equal(resolvePasswordResetEmailLocale({
      familyPreferredLocale: 'en-GB',
    }), 'en-GB');
    assert.equal(resolvePasswordResetEmailLocale({}), DEFAULT_LOCALE);
    assert.equal(resolvePasswordResetEmailLocale({ requestLocale: 'bogus' }), DEFAULT_LOCALE);
  });
});

describe('GET /api/i18n legacy aliases', () => {
  let server;
  let port;

  before(async () => {
    loadLocales();
    const app = createApp();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((r) => server.close(r));
  });

  async function fetchLocale(lang) {
    const res = await fetch(`http://127.0.0.1:${port}/api/i18n/${lang}`);
    return { status: res.status, body: await res.json() };
  }

  for (const lang of ['sv', 'sv-SE', 'en', 'en-GB']) {
    it(`/api/i18n/${lang} returns 200`, async () => {
      const { status, body } = await fetchLocale(lang);
      assert.equal(status, 200);
      assert.ok(body.app?.name);
    });
  }

  it('/api/i18n/sv_se normalizes via alias path', async () => {
    const { status, body } = await fetchLocale('sv_se');
    assert.equal(status, 200);
    assert.equal(body.app?.name, getLocale('sv-SE').app?.name);
  });

  it('/api/i18n/invalid returns 400', async () => {
    const { status, body } = await fetchLocale('fr-FR');
    assert.equal(status, 400);
    assert.ok(body.supported);
  });
});

describe('migration file ordering', () => {
  it('i18n migrations follow 1810000000000_family_avatar', () => {
    const fs = require('fs');
    const path = require('path');
    const names = fs.readdirSync(path.join(__dirname, '../migrations'))
      .filter((f) => f.endsWith('.js'))
      .sort();
    const idx = names.indexOf('1810000000000_family_avatar_private_storage.js');
    assert.ok(idx >= 0, 'base migration present');
    assert.deepEqual(
      names.slice(idx + 1, idx + 4),
      [
        '1810000000001_family_preferred_locale.js',
        '1810000000002_english_i18n_feature_flags.js',
        '1810000000003_journey_registry_locale_en_gb.js',
      ]
    );
  });
});

describe('locale-switcher UI', () => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');

  it('uses segmented buttons instead of native select', () => {
    const src = fs.readFileSync(path.join(ROOT, 'public/js/locale-switcher.js'), 'utf8');
    assert.match(src, /locale-switcher__track/);
    assert.match(src, /data-locale-value/);
    assert.match(src, /locale-switcher--dark/);
    assert.doesNotMatch(src, /<select/);
  });
});
