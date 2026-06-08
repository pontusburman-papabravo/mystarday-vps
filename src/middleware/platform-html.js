/**
 * platform-html.js — injects Release OS scripts into HTML (res.send + res.sendFile).
 * Idempotent when device-mode.js is already present.
 */
const fs = require('fs');
const path = require('path');

const RELEASE_TAG = '2026-06-08-native-theme';

function injectPlatformHtml(body) {
  if (typeof body !== 'string') return body;
  if (body.includes('device-mode.js')) return body;

  const headMarker = '<head>';
  const tailMarker = '</body>';

  const headParts = [
    '<script src="/js/platform.js?v=' + RELEASE_TAG + '"><\/script>',
  ];
  headParts.push(
    '<script src="/js/device-mode.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/session-gate.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/platform-theme.js?v=' + RELEASE_TAG + '"><\/script>',
    '<link rel="stylesheet" href="/css/platform-native.css?v=1.0.1">',
    '<link rel="stylesheet" href="/css/platform-gating.css?v=' + RELEASE_TAG + '">'
  );
  const headInject = headParts.join('\n') + '\n';

  const bodyInject =
    '<script src="/js/crash-reporter.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/deep-link-router.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parental-gate.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/native-tab-bar.js?v=' + RELEASE_TAG + '" defer><\/script>\n';

  const headIdx = body.indexOf(headMarker);
  if (headIdx !== -1) {
    body = body.slice(0, headIdx + headMarker.length) + '\n' + headInject + body.slice(headIdx + headMarker.length);
  }

  const tailIdx = body.lastIndexOf(tailMarker);
  if (tailIdx !== -1) {
    body = body.slice(0, tailIdx) + bodyInject + body.slice(tailIdx);
  }

  return body;
}

function platformHtmlInject(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    const ct = res.get('Content-Type') || '';
    if ((ct.includes('text/html') || (typeof body === 'string' && body.trim().startsWith('<!'))) && typeof body === 'string') {
      body = injectPlatformHtml(body);
      if (!ct.includes('text/html')) {
        res.type('html');
      }
    }
    return originalSend.call(this, body);
  };

  const originalSendFile = res.sendFile;
  res.sendFile = function (filePath, options, callback) {
    let opts = options;
    let cb = callback;
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    opts = opts || {};

    const file = typeof filePath === 'string' ? filePath : String(filePath);
    const ext = path.extname(file).toLowerCase();
    if (ext !== '.html' && ext !== '.htm') {
      return originalSendFile.call(this, filePath, opts, cb);
    }

    const resolved = path.isAbsolute(file) ? file : path.resolve(opts.root || process.cwd(), file);
    const self = this;

    fs.readFile(resolved, 'utf8', function (err, html) {
      if (err) {
        return originalSendFile.call(self, filePath, opts, cb);
      }
      self.type('html');
      self.send(injectPlatformHtml(html));
      if (cb) cb(null);
    });
  };

  next();
}

module.exports = platformHtmlInject;
module.exports.injectPlatformHtml = injectPlatformHtml;
