'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { normalizeArchiveFlags } = require('../db/landing-news');
const { localizeLandingNewsItem } = require('../src/lib/landing-news-locale');
const { buildArchiveListHtml } = require('../src/lib/landing-news-archive-html');

const ROOT = path.join(__dirname, '..');

describe('landing news archive', () => {
  it('normalizeArchiveFlags forces inactive when archived', () => {
    assert.deepEqual(normalizeArchiveFlags({ is_active: true, is_archived: true }), {
      is_active: false,
      is_archived: true,
    });
    assert.deepEqual(normalizeArchiveFlags({ is_active: true, is_archived: false }), {
      is_active: true,
      is_archived: false,
    });
  });

  it('localizeLandingNewsItem prefers English fields on en locale', () => {
    const row = {
      title: 'Svensk titel',
      body: 'Svensk text',
      title_en: 'English title',
      body_en: 'English body',
      button_text: 'Läs mer',
      button_text_en: 'Read more',
    };
    const en = localizeLandingNewsItem(row, 'en');
    assert.equal(en.title, 'English title');
    assert.equal(en.body, 'English body');
    assert.equal(en.button_text, 'Read more');
  });

  it('buildArchiveListHtml renders localized title', () => {
    const html = buildArchiveListHtml(
      [
        {
          title: 'SV',
          title_en: 'EN headline',
          body: 'x',
          archived_at: '2026-06-01T12:00:00.000Z',
        },
      ],
      'en'
    );
    assert.match(html, /EN headline/);
    assert.doesNotMatch(html, />SV</);
  });

  it('exposes sv/en archive routes and static shells', () => {
    const routeSrc = fs.readFileSync(path.join(ROOT, 'src/routes/landing-news-archive.js'), 'utf8');
    assert.match(routeSrc, /\/nyheter\/arkiv/);
    assert.match(routeSrc, /\/en\/news\/archive/);
    assert.ok(fs.existsSync(path.join(ROOT, 'public/nyheter-arkiv.html')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/en/news-archive.html')));

    const landing = fs.readFileSync(path.join(ROOT, 'src/routes/landing.js'), 'utf8');
    assert.match(landing, /Tidigare nyheter/);
    assert.match(landing, /News archive/);

    const index = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    assert.match(index, /\/nyheter\/arkiv/);
    const en = fs.readFileSync(path.join(ROOT, 'public/en.html'), 'utf8');
    assert.match(en, /\/en\/news\/archive/);
  });
});
