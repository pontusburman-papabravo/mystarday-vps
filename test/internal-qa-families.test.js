'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const qa = require('../config/internal-qa-families');

describe('internal-qa-families SQL helpers', () => {
  it('flags Smoke Parents and English Demo patterns', () => {
    const sql = qa.familyIsInternalQaSql('f');
    assert.match(sql, /Smoke Parents/);
    assert.match(sql, /English Demo \(QA\)/);
    assert.match(sql, /@test\.stjarndag\.local/);
  });

  it('excludeInternalQaWhere negates the expression', () => {
    assert.match(qa.excludeInternalQaWhere('f'), /^NOT \(/);
  });
});
