'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadLocales, t } = require('../src/lib/i18n');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'public/js/child-seven-questions.js');

function readSrc() {
  return fs.readFileSync(SRC, 'utf8');
}

function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('child-seven-questions i18n', () => {
  loadLocales();

  it('en-GB child render path has TEACCH copy keys', () => {
    assert.equal(t('en-GB', 'child.sevenQuestions.readAloud'), 'Read aloud');
    assert.equal(t('en-GB', 'child.sevenQuestions.exitActivity'), 'Exit activity');
    assert.equal(t('en-GB', 'child.sevenQuestions.labels.what'), 'What?');
    assert.equal(t('en-GB', 'child.todayWarmth.nowBadge'), 'Now');
  });

  it('sv-SE retains Swedish TEACCH copy keys', () => {
    assert.equal(t('sv-SE', 'child.sevenQuestions.readAloud'), 'Läs upp');
    assert.equal(t('sv-SE', 'child.sevenQuestions.exitActivity'), 'Avsluta aktivitet');
    assert.equal(t('sv-SE', 'child.sevenQuestions.labels.what'), 'Vad?');
  });

  it('does not hardcode Swedish user-visible literals in child-seven-questions.js', () => {
    const src = stripComments(readSrc());
    const banned = [
      'Läs upp',
      'Avsluta aktivitet',
      'Vad?',
      'Var?',
      'Vem?',
      'Hur länge?',
      'Vad händer sen?',
      'Vad behöver jag?',
      'Varför?',
      '> NU<',
      ' NU</div>',
    ];
    for (const phrase of banned) {
      assert.equal(src.includes(phrase), false, `unexpected hardcoded copy: ${phrase}`);
    }
    assert.match(src, /cpt\('sevenQuestions\.readAloud'\)/);
    assert.match(src, /cpt\('sevenQuestions\.exitActivity'\)/);
    assert.match(src, /cpt\('todayWarmth\.nowBadge'\)/);
    assert.match(src, /questionLabel\(key\)/);
  });
});
