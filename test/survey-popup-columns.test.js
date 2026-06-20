'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

test('migration adds survey popup + contest columns', () => {
  const mig = fs.readFileSync(
    path.join(__dirname, '../migrations/1807400000000_survey_popup_columns.js'),
    'utf8'
  );
  assert.match(mig, /popup_landing_enabled/);
  assert.match(mig, /popup_logged_in_enabled/);
  assert.match(mig, /popup_impression_count/);
  assert.match(mig, /CREATE TABLE IF NOT EXISTS survey_popup_interactions/);
  assert.match(mig, /CREATE TABLE IF NOT EXISTS survey_contest_entries/);
});
