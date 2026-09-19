'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');

const ENGLISH_OG_PAGES = [
  'public/en.html',
  'public/en-privacy.html',
  'public/en-terms.html',
  'public/en-pricing.html',
  'public/en/thank-you.html',
  'public/en/eea-privacy.html',
  'public/en/eea-terms.html',
  'public/en/eea-child-privacy.html',
  'public/en/tracking-choices.html',
  'public/en/educators-and-therapists.html',
  'public/en/alternative-visual-schedule-board.html',
];

function ogImageContent(html) {
  const m = html.match(/property="og:image"\s+content="([^"]+)"/);
  return m ? m[1] : null;
}

describe('locale Open Graph share image', () => {
  it('ships a 1200×630 English OG image', async () => {
    const file = path.join(ROOT, 'public/og-image-en.png');
    assert.equal(fs.existsSync(file), true);
    const meta = await sharp(file).metadata();
    assert.equal(meta.width, 1200);
    assert.equal(meta.height, 630);
    assert.equal(meta.format, 'png');
  });

  it('English marketing pages share the English OG image, not the Swedish one', () => {
    for (const rel of ENGLISH_OG_PAGES) {
      const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      const image = ogImageContent(html);
      assert.ok(image, `${rel} must declare og:image`);
      assert.match(image, /\/og-image-en\.png$/, `${rel} og:image must be English`);
      assert.doesNotMatch(html, /property="og:image" content="[^"]*\/og-image\.png"/, rel);
    }
  });

  it('Swedish home keeps the Swedish OG image', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
    assert.match(ogImageContent(html), /\/og-image\.png$/);
    assert.doesNotMatch(html, /og-image-en\.png/);
  });

  it('English home declares en_GB locale for link previews', () => {
    const html = fs.readFileSync(path.join(ROOT, 'public/en.html'), 'utf8');
    assert.match(html, /property="og:locale" content="en_GB"/);
    assert.match(html, /name="twitter:image" content="__SITE_URL__\/og-image-en\.png"/);
  });
});
