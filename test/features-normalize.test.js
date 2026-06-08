'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFeatureRow, asStringArray, toJsonbParam, sanitizeForJson } = require('../src/lib/feature-normalize');

describe('normalizeFeatureRow', () => {
  it('merges top-level dev_notes into documentation', () => {
    const row = {
      slug: 'test',
      name: 'Test',
      status: 'dev',
      documentation: { purpose: 'x' },
      dev_notes: [{ date: '2026-01-01', note: 'hello' }],
      changelog: [],
      tags: ['ui'],
    };
    const out = normalizeFeatureRow(row);
    assert.equal(out.documentation.purpose, 'x');
    assert.equal(out.documentation.dev_notes.length, 1);
    assert.equal(out.documentation.dev_notes[0].note, 'hello');
  });

  it('unwraps double-encoded documentation JSON string', () => {
    const inner = { purpose: 'y', dev_notes: [], changelog: [] };
    const row = {
      slug: 'test',
      name: 'Test',
      status: 'live',
      documentation: JSON.stringify(inner),
      dev_notes: [],
      changelog: [],
      tags: [],
    };
    const out = normalizeFeatureRow(row);
    assert.equal(out.documentation.purpose, 'y');
    assert.ok(Array.isArray(out.documentation.dev_notes));
  });

  it('coerces acceptance_criteria string to array', () => {
    const row = {
      slug: 'aktivitetsbibliotek',
      name: 'Aktivitetsbibliotek',
      status: 'live',
      documentation: {
        acceptance_criteria: 'Förälder kan skapa egna aktiviteter.',
      },
      dev_notes: [],
      changelog: [],
      tags: ['kärna'],
    };
    const out = normalizeFeatureRow(row);
    assert.deepEqual(out.documentation.acceptance_criteria, [
      'Förälder kan skapa egna aktiviteter.',
    ]);
  });

  it('asStringArray splits multiline strings', () => {
    assert.deepEqual(asStringArray('a\nb'), ['a', 'b']);
  });

  it('toJsonbParam rejects empty string and null bytes', () => {
    assert.equal(toJsonbParam('', {}), '{}');
    assert.equal(toJsonbParam({ note: 'a\u0000b' }, {}), '{"note":"ab"}');
  });

  it('sanitizeForJson drops NaN', () => {
    assert.equal(sanitizeForJson(Number.NaN), null);
  });
});
