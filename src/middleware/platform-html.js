/**
 * platform-html.js — injects Release OS scripts into HTML (res.send + res.sendFile).
 * Idempotent when device-mode.js is already present.
 */
const fs = require('fs');
const path = require('path');

const RELEASE_TAG = '2026-05-29-release-os';

function injectPlatformHtml(body) {
  if (typeof body !== 'string') return body;
  if (body.includes('device-mode.js')) return body;

  var headMarker = '<head>';
  var tailMarker = '</body>';

  var headParts = [];
  if (!body.includes('/js/platform.js')) {
    headParts.push('<script src="/js/platform.js?v=' + RELEASE_TAG + '"><\/script>');
  }
  headParts.push(
    '<script src="/js/device-mode.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/session-gate.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/platform-theme.js?v=' + RELEASE_TAG + '"><\/script>',
    '<link rel="stylesheet" href="/css/platform-native.css?v=1.0.1">',
    '<link rel="stylesheet" href="/css/platform-gating.css?v=' + RELEASE_TAG + '">'
  );
  var headInject = headParts.join('\n') + '\n';

  var bodyInject =
    '<script src="/js/crash-reporter.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/deep-link-router.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parental-gate.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/native-tab-bar.js?v=' + RELEASE_TAG + '" defer><\/script>\n';

  var headIdx = body.indexOf(headMarker);
  if (headIdx !== -1) {
    body = body.slice(0, headIdx + headMarker.length) + '\n' + headInject + body.slice(headIdx + headMarker.length);
  }

  var tailIdx = body.lastIndexOf(tailMarker);
  if (tailIdx !== -1) {
    body = body.slice(0, tailIdx) + bodyInject + body.slice(tailIdx);
  }

  return body;
}

function platformHtmlInject(req, res, next) {
  var originalSend = res.send;
  res.send = function (body) {
    var ct = res.get('Content-Type') || '';
    if ((ct.includes('text/html') || (typeof body === 'string' && body.trim().startsWith('<!'))) && typeof body === 'string') {
      body = injectPlatformHtml(body);
      if (!ct.includes('text/html')) {
        res.type('html');
      }
    }
    return originalSend.call(this, body);
  };

  var originalSendFile = res.sendFile;
  res.sendFile = function (filePath, options, callback) {
    var opts = options;
    var cb = callback;
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    opts = opts || {};

    var file = typeof filePath === 'string' ? filePath : String(filePath);
    var ext = path.extname(file).toLowerCase();
    if (ext !== '.html' && ext !== '.htm') {
      return originalSendFile.call(this, filePath, opts, cb);
    }

    var resolved = path.isAbsolute(file) ? file : path.resolve(opts.root || process.cwd(), file);
    var self = this;

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
