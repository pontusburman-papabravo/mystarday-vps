'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('stream');
const zlib = require('zlib');
const { loadLocales, t } = require('../src/lib/i18n');
const { generateReportPdf } = require('../src/lib/report-pdf');
const { mapReportToPlayful } = require('../src/lib/report-playful-mapper');
const { withLocaleCatalog } = require('../src/lib/locale');

loadLocales();

const blocks = {
  section_summary: [
    { section: 'morgon', completion_pct: 80 },
    { section: 'kvall', completion_pct: 40 },
  ],
  completion: [],
  stars: { total: 3 },
  rewards: { counts: [{ status: 'approved', count: 1 }] },
  activities: {},
};

function decodeWinAnsi(content) {
  const parts = [];
  const re = /<([0-9A-Fa-f]+)>/g;
  let match;
  while ((match = re.exec(content))) {
    const hex = match[1];
    let text = '';
    for (let i = 0; i < hex.length; i += 2) {
      text += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16));
    }
    parts.push(text);
  }
  return parts.join('');
}

function pdfText(buffer) {
  const raw = buffer.toString('latin1');
  const parts = [];
  const re = /stream\r?\n([\s\S]*?)endstream/g;
  let match;
  while ((match = re.exec(raw))) {
    const body = Buffer.from(match[1], 'latin1');
    try {
      parts.push(zlib.inflateSync(body).toString('latin1'));
    } catch {
      parts.push(match[1]);
    }
  }
  return decodeWinAnsi(parts.join('\n'));
}

function render(locale) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = new PassThrough();
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(pdfText(Buffer.concat(chunks))));
    stream.on('error', reject);
    generateReportPdf(stream, {
      link: { label: 'Report', child_name: 'Nova', anonymous: false, parent_summary: 'A calm week' },
      fields: ['stars', 'rewards'],
      blocks,
      dateFrom: '2026-10-01',
      dateTo: '2026-10-06',
      locale,
    });
  });
}

describe('family report locale', () => {
  it('uses Swedish section labels for sv-SE and English labels for en-GB', async () => {
    const swedish = await render('sv-SE');
    const english = await render('en-GB');
    assert.match(swedish, /Morgon/);
    assert.match(swedish, /Ingen data för perioden/);
    assert.match(swedish, /Sid\. 1\//);
    assert.doesNotMatch(swedish, /No data for this period/);
    assert.match(english, /Morning/);
    assert.match(english, /No data for this period/);
    assert.match(english, /Page 1\//);
    assert.doesNotMatch(english, /Morgon/);
    assert.doesNotMatch(english, /Ingen data/);
    assert.doesNotMatch(english, /Kväll/);
  });

  it('localizes the playful view model and falls back to English for a future locale', () => {
    const swedish = mapReportToPlayful({
      link: { child_name: 'Nova' },
      blocks,
      fields: ['section_summary'],
      dateFrom: '2026-10-01',
      dateTo: '2026-10-06',
      locale: 'sv-SE',
    });
    const english = mapReportToPlayful({
      link: { child_name: 'Nova' },
      blocks,
      fields: ['section_summary'],
      dateFrom: '2026-10-01',
      dateTo: '2026-10-06',
      locale: 'en-GB',
    });
    assert.equal(swedish.sections[0].label, 'Morgon');
    assert.equal(english.sections[0].label, 'Morning');
    assert.match(english.title, /SUMMARY FOR NOVA/);
    assert.match(swedish.title, /SAMMANFATTNING FÖR NOVA/);

    const frenchCatalog = {
      defaultLocale: 'sv-SE',
      fallbackLocale: 'en-GB',
      locales: [
        { id: 'sv-SE', nativeName: 'Svenska', base: 'sv', aliases: ['sv'], availability: 'public', experiencePack: 'child_se', contentSource: 'canonical-db' },
        { id: 'en-GB', nativeName: 'English', base: 'en', aliases: ['en'], availability: 'public', experiencePack: 'child_en', contentSource: 'locale-files' },
        { id: 'fr-FR', nativeName: 'Français', base: 'fr', aliases: ['fr'], availability: 'registered', experiencePack: 'child_fr', contentSource: 'locale-files' },
      ],
    };
    withLocaleCatalog(frenchCatalog, () => {
      assert.equal(t('fr-FR', 'reports.professional.sectionMorning'), 'Morning');
      const french = mapReportToPlayful({
        link: {},
        blocks,
        fields: ['section_summary'],
        dateFrom: '2026-10-01',
        dateTo: '2026-10-06',
        locale: 'fr-FR',
      });
      assert.equal(french.sections[0].label, 'Morning');
      assert.notEqual(french.sections[0].label, 'Morgon');
    });
  });
});
