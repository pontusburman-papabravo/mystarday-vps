'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { loadLocales, t } = require('../src/lib/i18n');
const { sendApiError, apiErrorBody } = require('../src/lib/api-user-error');
const { validateCustomConfiguration } = require('../src/lib/custody-custom-config');

const ROOT = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const KEYS = [
  'family.errors.uploadHeicFailed',
  'family.errors.uploadTooLarge',
  'family.errors.custodyTwoHomesRequired',
  'family.errors.custodyCycleDayRequired',
  'family.errors.childNameRequired',
  'family.errors.namePinTaken',
  'family.errors.inviteSendFailed',
  'library.errors.activityNameRequired',
  'library.errors.rewardNotFound',
  'library.errors.activityInUse',
  'settings.push.errors.subscriptionFailed',
  'settings.push.errors.notConfigured',
  'auth.errors.invalidValues',
  'auth.errors.emailInvalid',
  'today.errors.saveRating',
  'today.errors.ratingScoreRange',
  'auth.errors.serverError',
  'family.errors.childAccessDenied',
  'family.errors.childNotFound',
  'family.errors.fetchChildrenFailed',
  'auth.errors.userNotFound',
  'reports.errors.notFound',
];

function buildMapper(locale) {
  const src = read('public/js/api-error-i18n.js');
  const sandbox = {
    window: {},
    I18n: {
      getCurrentLang: () => locale,
      t: (key, params) => t(locale, key, params),
    },
  };
  sandbox.window.I18n = sandbox.I18n;
  vm.runInNewContext(src, sandbox, { filename: 'api-error-i18n.js' });
  return sandbox.window.apiErrorMessage;
}

describe('API error contracts i18n', () => {
  before(() => {
    loadLocales();
  });

  it('sendApiError uses language-neutral code as error', () => {
    const captured = {};
    const res = {
      status(code) {
        captured.status = code;
        return this;
      },
      json(body) {
        captured.body = body;
        return this;
      },
    };
    sendApiError(res, 400, 'UPLOAD_HEIC_CONVERT_FAILED', { details: { maxMb: 5 } });
    assert.equal(captured.status, 400);
    assert.equal(captured.body.code, 'UPLOAD_HEIC_CONVERT_FAILED');
    assert.equal(captured.body.error, 'UPLOAD_HEIC_CONVERT_FAILED');
    assert.deepEqual(captured.body.details, { maxMb: 5 });
    assert.doesNotMatch(captured.body.error, /[åäöÅÄÖ]/);
  });

  it('apiErrorBody keeps extra fields besides details', () => {
    const body = apiErrorBody('DUPLICATE_CHILD_NAME', {
      details: { name: 'Astrid' },
      suggestions: ['Astrid 2'],
    });
    assert.equal(body.code, 'DUPLICATE_CHILD_NAME');
    assert.deepEqual(body.suggestions, ['Astrid 2']);
  });

  it('upload and avatar backends have no Swedish error literals', () => {
    for (const file of [
      'src/routes/upload.js',
      'src/lib/avatar-upload.js',
      'src/routes/children-avatar.js',
    ]) {
      const src = read(file);
      assert.doesNotMatch(src, /\b(error|userMessage)\s*:\s*'[^']*[åäöÅÄÖ]/);
      assert.match(src, /UPLOAD_HEIC_CONVERT_FAILED|UPLOAD_INVALID_IMAGE|sendApiError/);
    }
  });

  it('custody validation returns codes not Swedish', () => {
    const missing = validateCustomConfiguration(null, ['a', 'b']);
    assert.equal(missing.ok, false);
    assert.equal(missing.code, 'CUSTODY_CYCLE_WEEKS_REQUIRED');

    const allA = {
      mon: 'a', tue: 'a', wed: 'a', thu: 'a', fri: 'a', sat: 'a', sun: 'a',
    };
    const twoHome = validateCustomConfiguration({ cycle_weeks: [allA] }, ['a', 'b']);
    assert.equal(twoHome.ok, false);
    assert.equal(twoHome.code, 'CUSTODY_TWO_HOMES_REQUIRED');
    assert.doesNotMatch(twoHome.error, /hem|mönster/i);
    assert.match(read('src/routes/family/custody.js'), /const analytics = require\('\.\.\/\.\.\/\.\.\/db\/analytics'\)/);
  });

  it('validate middleware and PIN/email schemas use stable codes', () => {
    const validateSrc = read('src/middleware/validate.js');
    assert.match(validateSrc, /VALIDATION_INVALID_VALUES/);
    assert.doesNotMatch(validateSrc, /error: 'Ogiltiga värden'/);
    const schemas = read('src/lib/schemas.js');
    assert.match(schemas, /VALIDATION_PIN_4_DIGITS/);
    assert.match(schemas, /VALIDATION_EMAIL_INVALID/);
  });

  it('push subscribe path sends PUSH_INVALID_SUBSCRIPTION', () => {
    const src = read('src/routes/push.js');
    assert.match(src, /PUSH_INVALID_SUBSCRIPTION/);
    assert.match(src, /PUSH_SAVE_FAILED/);
    assert.doesNotMatch(src, /Ogiltigt subscription-objekt/);
  });

  it('representative CRUD and ratings/invite paths send codes', () => {
    const activities = read('src/routes/activities.js');
    assert.match(activities, /ACTIVITY_NAME_REQUIRED/);
    assert.match(activities, /ACTIVITY_IN_USE/);
    const rewards = read('src/routes/rewards.js');
    assert.match(rewards, /REWARD_NOT_FOUND/);
    const children = read('src/routes/children.js');
    assert.match(children, /CHILD_PIN_INVALID_FORMAT/);
    assert.match(children, /CHILD_NAME_REQUIRED/);
    const invites = read('src/routes/family/invites.js');
    assert.match(invites, /INVITE_SEND_FAILED/);
    const ratings = read('src/routes/ratings.js');
    assert.match(ratings, /RATING_SCORE_OR_EMOTION_REQUIRED/);
    assert.match(ratings, /RATING_PARENT_SCORE_RANGE/);
    assert.match(ratings, /message: 'Betyg sparat/);
  });

  it('Auth.api maps via apiErrorMessage and does not prefer data.error', () => {
    const auth = read('public/js/auth.js');
    assert.match(auth, /window\.apiErrorMessage/);
    assert.doesNotMatch(auth, /const msg = data\?\.error \|\| \(data\?\.message\)/);
  });

  it('frontend consumers prefer code mapping over Swedish error', () => {
    const files = {
      'public/js/family.js': /apiErrorMessage\(data, 'family\.errors\.upload'\)/,
      'public/js/library.js': /libApiError\(/,
      'public/js/library-images.js': /apiErrorMessage\(data, 'library\.images\.uploadFailed'\)/,
      'public/js/push-manager.js': /apiErrorMessage\(err, 'settings\.push\.errors\.subscriptionFailed'\)/,
      'public/js/custody-settings.js': /family\.errors\.custodyTwoHomesRequired/,
      'public/js/avatar-upload-flow.js': /apiErrorMessage\(err, 'family\.errors\.upload'\)/,
      'public/js/daily-log.js': /today\.errors\.saveRating/,
    };
    for (const [file, re] of Object.entries(files)) {
      assert.match(read(file), re, file);
    }
    assert.doesNotMatch(read('public/js/push-manager.js'), /err\.error \|\| pt\(/);
  });

  it('en-GB mapper never returns Swedish server strings', () => {
    const map = buildMapper('en-GB');
    const samples = [
      { error: 'Ogiltiga värden', code: 'VALIDATION_INVALID_VALUES' },
      { error: 'iPhone-bilden (HEIC) kunde inte konverteras', code: 'UPLOAD_HEIC_CONVERT_FAILED' },
      { error: 'Ogiltiga värden' },
      { code: 'ACTIVITY_NAME_REQUIRED', error: 'Aktivitetsnamn krävs' },
      { code: 'PUSH_SAVE_FAILED', error: 'Kunde inte spara push-prenumeration' },
      { code: 'CUSTODY_TWO_HOMES_REQUIRED' },
      { code: 'CHILD_PIN_INVALID_FORMAT' },
      { code: 'RATING_PARENT_SCORE_RANGE' },
      { error: 'Belöning hittades inte', code: 'REWARD_NOT_FOUND' },
    ];
    for (const data of samples) {
      const msg = map(data);
      assert.doesNotMatch(
        msg,
        /Ogiltiga värden|Aktivitetsnamn|Kunde inte spara push|två olika hem|PIN-koden måste|Belöning hittades/i,
        JSON.stringify(data) + ' => ' + msg
      );
    }
    assert.match(map({ code: 'UPLOAD_HEIC_CONVERT_FAILED' }), /HEIC|JPEG/i);
    assert.match(map({ code: 'ACTIVITY_NAME_REQUIRED' }), /Activity name/i);
    assert.match(map({ code: 'VALIDATION_INVALID_VALUES' }), /Invalid values/i);
  });

  it('sv-SE mapper uses locale copy for known codes', () => {
    const map = buildMapper('sv-SE');
    assert.match(map({ code: 'ACTIVITY_NAME_REQUIRED' }), /Aktivitetsnamn/);
    assert.match(map({ code: 'CHILD_PIN_INVALID_FORMAT' }), /4 siffror/i);
    assert.match(map({ code: 'CUSTODY_TWO_HOMES_REQUIRED' }), /två olika hem/i);
  });

  it('locale keys exist with sv-SE / en-GB parity', () => {
    for (const key of KEYS) {
      const sv = t('sv-SE', key);
      const en = t('en-GB', key);
      assert.ok(sv && sv !== key, key + ' sv-SE');
      assert.ok(en && en !== key, key + ' en-GB');
      assert.notEqual(sv, en, key);
    }
  });

  it('platform injects api-error-i18n.js and SW precaches it', () => {
    assert.match(read('src/middleware/platform-html.js'), /api-error-i18n\.js/);
    assert.match(read('public/sw.js'), /\/js\/api-error-i18n\.js/);
    assert.match(read('public/sw.js'), /stjarndag-v\d+/);
  });
});
