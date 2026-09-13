'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const { injectParentMagicHtml } = require('../src/middleware/platform-html');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('assign-schedule hero i18n', () => {
  it('assign-schedule.html loads i18n before magic hubs and inits after auth', () => {
    const html = read('public/assign-schedule.html');
    assert.match(html, /\/js\/i18n\.js/);
    assert.match(html, /parent-app-i18n\.js/);
    assert.match(html, /data-i18n-manual-init="true"/);
    assert.match(html, /initParentAppI18n\(user\.preferred_locale\)/);
    const i18nIdx = html.indexOf('/js/i18n.js');
    const hubsIdx = html.indexOf('parent-magic-page-hubs.js');
    assert.ok(i18nIdx !== -1);
    if (hubsIdx !== -1) assert.ok(i18nIdx < hubsIdx);
  });

  it('hero fallbacks cover assign-schedule keys so raw keys never show', () => {
    const src = read('public/js/parent-magic-page-hubs.js');
    assert.match(src, /settings\.heroes\.assignSchedule\.title/);
    assert.match(src, /settings\.backToPlanning/);
    assert.match(src, /'settings\.heroes\.assignSchedule\.title': 'Tilldela schema'/);
    assert.match(src, /'settings\.backToPlanning': '← Till planering'/);
  });

  it('platform inject adds i18n.js on assign-schedule when the HTML omits it', () => {
    const html = '<!DOCTYPE html><html><head><title>T</title></head><body><main>x</main></body></html>';
    const out = injectParentMagicHtml(html, '/assign-schedule');
    assert.match(out, /\/js\/i18n\.js/);
  });
});

describe('print-schema native PDF delivery', () => {
  it('print-schema.html vendors PDF libs instead of cdnjs', () => {
    const html = read('public/print-schema.html');
    assert.match(html, /\/vendor\/html2canvas\.min\.js/);
    assert.match(html, /\/vendor\/jspdf\.umd\.min\.js/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com/);
    assert.match(html, /id="pdfViewerModal"/);
    assert.match(html, /id="pdfViewerPreview"/);
    assert.match(html, /data-i18n="printSchema\.overlay\.title"/);
    assert.ok(fs.existsSync(path.join(ROOT, 'public/vendor/html2canvas.min.js')));
    assert.ok(fs.existsSync(path.join(ROOT, 'public/vendor/jspdf.umd.min.js')));
  });

  it('professional-report.html vendors the same PDF libs', () => {
    const html = read('public/professional-report.html');
    assert.match(html, /\/vendor\/html2canvas\.min\.js/);
    assert.match(html, /\/vendor\/jspdf\.umd\.min\.js/);
    assert.doesNotMatch(html, /cdnjs\.cloudflare\.com\/ajax\/libs\/html2canvas/);
  });

  it('downloadPdf tries share on native even when canShare is false', () => {
    const src = read('public/js/print-schema-core.js');
    assert.match(src, /isNativeOrMobileClient/);
    assert.match(src, /trySharePdfFile/);
    assert.match(src, /preferShare = isNativeOrMobileClient\(\) \|\| canShareFiles\(\)/);
    assert.match(src, /iOS WKWebView/);
    assert.match(src, /previewDataUrl/);
  });

  it('print-schema.js shows an in-app viewer when native share/download is a no-op', () => {
    const src = read('public/js/print-schema.js');
    assert.match(src, /openPdfViewerOverlay/);
    assert.match(src, /isNativeApp\(\) \|\| isMobileDevice\(\)/);
    assert.match(src, /printSchema\.toasts\.nativeViewerHint/);
    assert.match(src, /sharePdfViewerBlob/);
  });

  it('print-schema overlay copy exists in both locales', () => {
    const sv = JSON.parse(read('config/i18n/print-schema-sv-SE.json'));
    const en = JSON.parse(read('config/i18n/print-schema-en-GB.json'));
    assert.equal(sv.overlay.title, 'Din PDF');
    assert.equal(en.overlay.title, 'Your PDF');
    assert.ok(sv.toasts.nativeViewerHint);
    assert.ok(en.toasts.shareUnavailable);
  });
});
