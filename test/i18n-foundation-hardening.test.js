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
    ['fr-FR', 'fr-FR'],
    ['nl-NL', 'nl-NL'],
    ['da-DK', 'da-DK'],
    ['fi-FI', 'fi-FI'],
    ['nb-NO', 'nb-NO'],
    ['no', 'nb-NO'],
    ['es-ES', 'es-ES'],
    ['es', 'es-ES'],
    ['it-IT', 'it-IT'],
    ['pt-PT', 'pt-PT'],
    ['pl-PL', 'pl-PL'],
    ['cs-CZ', 'cs-CZ'],
    ['cs', 'cs-CZ'],
    ['sk-SK', 'sk-SK'],
    ['sl-SI', 'sl-SI'],
    ['hr-HR', 'hr-HR'],
    ['hu-HU', 'hu-HU'],
    ['ro-RO', 'ro-RO'],
    ['bg-BG', 'bg-BG'],
    ['bg', 'bg-BG'],
    ['el-GR', 'el-GR'],
    ['el', 'el-GR'],
    ['et-EE', 'et-EE'],
    ['et', 'et-EE'],
    ['lt-LT', 'lt-LT'],
    ['lt', 'lt-LT'],
    ['lv-LV', 'lv-LV'],
    ['lv', 'lv-LV'],
    ['is-IS', null],
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

describe('experience pack follows family locale', () => {
  it('en-GB uses child_en even when english_child_experience is off', () => {
    assert.equal(experiencePackIdForLocale('en-GB'), 'child_en');
    assert.equal(experiencePackIdForLocale('en-GB', { englishChildExperienceEnabled: false }), 'child_en');
  });

  it('the child flag does not change the en-GB pack', () => {
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

  it('password reset prefers stored family locale', () => {
    assert.equal(resolvePasswordResetEmailLocale({
      familyPreferredLocale: 'en-GB',
      requestLocale: 'sv-SE',
    }), 'en-GB');
  });

  it('password reset falls back to request locale then sv-SE', () => {
    assert.equal(resolvePasswordResetEmailLocale({
      requestLocale: 'en-GB',
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

  it('/api/i18n/fr-FR returns the French bundle', async () => {
    const { status, body } = await fetchLocale('fr-FR');
    assert.equal(status, 200);
    assert.equal(body.auth?.login?.title, 'Connexion');
    assert.equal(body.auth?.login?.title, getLocale('fr-FR').auth?.login?.title);
  });

  it('/api/i18n/es-ES returns the Spanish bundle', async () => {
    const { status, body } = await fetchLocale('es-ES');
    assert.equal(status, 200);
    assert.equal(body.auth?.login?.title, 'Entrar');
    assert.equal(body.auth?.login?.title, getLocale('es-ES').auth?.login?.title);
  });

  it('/api/i18n/invalid returns 400', async () => {
    const { status, body } = await fetchLocale('is-IS');
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
