/**
 * platform-html.js — injects Release OS scripts into HTML (res.send + res.sendFile).
 * Idempotent when device-mode.js is already present.
 */
const fs = require('fs');
const path = require('path');

const RELEASE_TAG = '2026-06-14-prevent-zoom';
const INJECT_MARKER = '<!-- platform-html-inject -->';
const MAGIC_INJECT_MARKER = '<!-- parent-magic-inject -->';
const MAGIC_VERSION = '3';

const PARENT_MAGIC_PATHS = new Set([
  '/dashboard',
  '/daily-log',
  '/schedule',
  '/calendar',
  '/activities',
  '/assign-schedule',
  '/for-dig',
  '/family',
  '/settings',
  '/library',
  '/skattkammaren',
  '/child-settings',
  '/notifications',
]);

function normalizeHtmlPath(path) {
  if (!path) return '';
  let p = path.replace(/\/$/, '') || '/';
  if (p.endsWith('.html')) p = p.slice(0, -5);
  return p;
}

function injectParentMagicHtml(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  if (body.includes(MAGIC_INJECT_MARKER) || body.includes('parent-magic-shell.js')) return body;

  const path = normalizeHtmlPath(reqPath);
  if (!PARENT_MAGIC_PATHS.has(path)) return body;

  const cssBlock = [
    MAGIC_INJECT_MARKER,
    '<link rel="stylesheet" href="/css/parent-bottom-nav.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/parent-magic-3d.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/parent-magic-common.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/app-view-toggle.css?v=' + MAGIC_VERSION + '">',
  ].join('\n');

  const scriptBlock = [
    '<script src="/js/app-view-mode.js?v=3"><\/script>',
    '<script src="/js/parent-magic-page-hubs.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-shell.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-auto.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-bootstrap.js?v=' + MAGIC_VERSION + '"><\/script>',
  ].join('\n');

  const headMarker = '<head>';
  const headIdx = body.indexOf(headMarker);
  if (headIdx !== -1) {
    body = body.slice(0, headIdx + headMarker.length) + '\n' + cssBlock + '\n' + body.slice(headIdx + headMarker.length);
  }

  const tailMarker = '</body>';
  const tailIdx = body.lastIndexOf(tailMarker);
  if (tailIdx !== -1) {
    body = body.slice(0, tailIdx) + scriptBlock + '\n' + body.slice(tailIdx);
  }

  return body;
}

function injectPlatformHtml(body, reqPath) {
  if (typeof body !== 'string') return body;
  if (body.includes(INJECT_MARKER)) return body;

  const headMarker = '<head>';
  const tailMarker = '</body>';

  const headParts = [INJECT_MARKER];
  if (!/\/js\/platform\.js/i.test(body)) {
    headParts.push('<script src="/js/platform.js?v=' + RELEASE_TAG + '"><\/script>');
  }
  headParts.push(
    '<script src="/js/package-access-cache.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/features-cache.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/device-mode.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/session-gate.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/platform-theme.js?v=' + RELEASE_TAG + '"><\/script>',
    '<link rel="stylesheet" href="/css/platform-native.css?v=1.0.4">',
    '<link rel="stylesheet" href="/css/platform-gating.css?v=' + RELEASE_TAG + '">',
    '<link rel="stylesheet" href="/css/parent-tab-bar.css?v=' + RELEASE_TAG + '">'
  );
  const headInject = headParts.join('\n') + '\n';

  const bodyInject =
    '<script src="/js/apple-sign-in-diagnostics.js?v=2026-06-22c"><\/script>\n' +
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

  return injectParentMagicHtml(body, reqPath);
}

function platformHtmlInject(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    const ct = res.get('Content-Type') || '';
    if ((ct.includes('text/html') || (typeof body === 'string' && body.trim().startsWith('<!'))) && typeof body === 'string') {
      body = injectPlatformHtml(body, req.path);
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
      self.send(injectPlatformHtml(html, req.path));
      if (cb) cb(null);
    });
  };

  next();
}

module.exports = platformHtmlInject;
module.exports.injectPlatformHtml = injectPlatformHtml;
module.exports.injectParentMagicHtml = injectParentMagicHtml;
