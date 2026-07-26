'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../..');

const REQUIRED_PATHS = [
  'public/js/login-locale.js',
  'public/js/auth-entry-failsafe.js',
  'public/js/auth-entry-i18n.js',
  'src/lib/apply-login-locale.js',
  'src/lib/auth-api-messages.js',
];

function i18nAuthStackPresent() {
  return REQUIRED_PATHS.every((rel) => fs.existsSync(path.join(ROOT, rel)));
}

function skipUnlessI18nStack(t, label = 'i18n auth/locale stack') {
  if (!i18nAuthStackPresent()) {
    t.skip(`Missing ${label} — merge PR #742 + #747 before running E2E i18n tests`);
    return false;
  }
  return true;
}

module.exports = { i18nAuthStackPresent, skipUnlessI18nStack, REQUIRED_PATHS };
