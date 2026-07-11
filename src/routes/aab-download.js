'use strict';

const fs = require('fs');
const path = require('path');

const AAB_PATH = path.join(__dirname, '../../data/downloads/play-release.aab');
const AAB_FILENAME = 'play-release-v6.aab';

/**
 * Token-gated AAB download for Play Console upload (founder / internal).
 * Set AAB_DOWNLOAD_TOKEN on the server; file at data/downloads/play-release.aab
 */
function registerAabDownloadRoute(app) {
  app.get('/downloads/play-release.aab', (req, res) => {
    const expected = process.env.AAB_DOWNLOAD_TOKEN;
    if (!expected || req.query.token !== expected) {
      return res.status(404).type('text/plain').send('Not found');
    }
    if (!fs.existsSync(AAB_PATH)) {
      return res.status(404).type('text/plain').send('Not found');
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${AAB_FILENAME}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(AAB_PATH);
  });

  app.get('/downloads/android', (req, res) => {
    const expected = process.env.AAB_DOWNLOAD_TOKEN;
    if (!expected || req.query.token !== expected) {
      return res.status(404).type('text/plain').send('Not found');
    }
    if (!fs.existsSync(AAB_PATH)) {
      return res.status(404).type('text/html').send(
        '<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>AAB saknas</title></head><body><p>Filen är inte uppladdad än.</p></body></html>',
      );
    }
    const mb = (fs.statSync(AAB_PATH).size / (1024 * 1024)).toFixed(1);
    const href = `/downloads/play-release.aab?token=${encodeURIComponent(expected)}`;
    res.type('html').send(
      '<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<meta name="robots" content="noindex,nofollow">'
      + '<title>Ladda ner Android-build</title>'
      + '<style>body{font-family:system-ui,sans-serif;max-width:28rem;margin:2rem auto;padding:0 1rem;}'
      + 'a{display:block;text-align:center;background:#1a1a2e;color:#fff;padding:1rem 1.25rem;'
      + 'border-radius:12px;text-decoration:none;font-weight:600;margin-top:1.5rem;}'
      + 'p{color:#444;line-height:1.5;}</style></head><body>'
      + '<h1>Android-build (AAB)</h1>'
      + `<p>versionCode 6 · ${mb} MB<br>Ladda ner till telefonen och ladda upp i Play Console från dator.</p>`
      + `<a href="${href}" download="${AAB_FILENAME}">Ladda ner AAB</a>`
      + '</body></html>',
    );
  });
}

module.exports = { registerAabDownloadRoute };
