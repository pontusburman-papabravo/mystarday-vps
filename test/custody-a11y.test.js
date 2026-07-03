'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  homeInitial,
  dayCustodyHint,
  homeMarkerHtml,
  previewCellHtml,
} = require(path.join(__dirname, '../public/js/custody-a11y.js'));

describe('custody-a11y helpers', () => {
  it('homeInitial returns first letter uppercase', () => {
    assert.equal(homeInitial('mamma'), 'M');
    assert.equal(homeInitial(''), '?');
  });

  it('dayCustodyHint prefixes hemnamn', () => {
    assert.equal(dayCustodyHint('Pappa'), 'Hos Pappa');
    assert.equal(dayCustodyHint(''), '');
  });

  it('homeMarkerHtml includes visible label — color not sole bearer', () => {
    const html = homeMarkerHtml({ label: 'Mamma', color: '#E11D48' }, (s) => s);
    assert.match(html, /custody-home-swatch/);
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, />Mamma</);
    assert.match(html, /#E11D48/);
  });

  it('previewCellHtml exposes aria-label with full hemnamn', () => {
    const html = previewCellHtml({ label: 'Pappa', color: '#2563EB' }, { esc: (s) => s });
    assert.match(html, /aria-label="Pappa"/);
    assert.match(html, /aria-hidden="true">P</);
  });
});
