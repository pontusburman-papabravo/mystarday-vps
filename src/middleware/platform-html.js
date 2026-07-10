/**
 * platform-html.js — injects Release OS scripts into HTML (res.send + res.sendFile).
 * Idempotent when device-mode.js is already present.
 */
const fs = require('fs');
const path = require('path');
const { injectNoindexMeta, isSeoIndexable, normalizeSeoPath } = require('../lib/seo-pages');

const RELEASE_TAG = '2026-06-24-native-sw-guard';
const INJECT_MARKER = '<!-- platform-html-inject -->';
const MAGIC_INJECT_MARKER = '<!-- parent-magic-inject -->';
const MAGIC_VERSION = '25';

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
  '/planning',
  '/rewards',
  '/family/child',
]);

function normalizeHtmlPath(path) {
  if (!path) return '';
  let p = path.replace(/\/$/, '') || '/';
  if (p.endsWith('.html')) p = p.slice(0, -5);
  return p;
}

// Magic paths include the static set plus the dynamic per-child settings page
// (/family/child/:id), which carries an id segment and so needs prefix matching.
function isMagicPath(p) {
  return PARENT_MAGIC_PATHS.has(p) || p.indexOf('/family/child/') === 0;
}

function buildEarlyMagicScriptTag() {
  const magicPathsJson = JSON.stringify([...PARENT_MAGIC_PATHS]);
  return (
    '<style id="parent-magic-early-style">html.parent-magic-early,html.parent-magic-early body{background:#07071a!important;color:#f4f4ff!important}' +
    'html.parent-magic-early body nav#sidebar,html.parent-magic-early body nav.w-full.md\\:w-64,' +
    'html.parent-magic-early body .md\\:hidden.bg-navy.sticky,html.parent-magic-early body .mobile-topbar{display:none!important}' +
    'html.parent-magic-early body .bg-sky,html.parent-magic-early body .bg-cream{background:transparent!important}' +
    'html.parent-magic-early.parent-theme-light,html.parent-magic-early.parent-theme-light body{background:#ffffff!important;color:#1a1633!important}</style>' +
    '<script id="parent-magic-early-boot">(function(){try{var p=(location.pathname||"/").replace(/\\/$/,"")||"/";' +
    'var pages=' + magicPathsJson + ';' +
    'if(pages.indexOf(p)<0&&p.indexOf("/family/child/")!==0)return;' +
    // Magic is now the only parent view — always apply it on magic paths.
    'document.documentElement.classList.add("parent-magic-early");' +
    'var light=localStorage.getItem("stjarndag_parent_theme")==="light";' +
    'document.documentElement.classList.add(light?"parent-theme-light":"parent-theme-dark");' +
    'var tc=document.querySelector(\'meta[name="theme-color"]\');' +
    'if(tc)tc.setAttribute("content",light?"#f4f1ff":"#07071a");}catch(e){}})();<\/script>'
  );
}

/** Blocking head script — runs before first paint on all parent shell pages. */
function injectEarlyMagicHtml(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  if (body.includes('parent-magic-early-boot')) return body;
  const path = normalizeHtmlPath(reqPath);
  if (!isMagicPath(path)) return body;
  const headMarker = '<head>';
  const headIdx = body.indexOf(headMarker);
  if (headIdx === -1) return body;
  const script = buildEarlyMagicScriptTag();
  return body.slice(0, headIdx + headMarker.length) + '\n' + script + '\n' + body.slice(headIdx + headMarker.length);
}

/** Inject soft-nav scripts even when shell scripts are already in the HTML file. */
function injectParentMagicRouter(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  if (body.includes('parent-magic-router.js')) return body;
  const path = normalizeHtmlPath(reqPath);
  if (!isMagicPath(path)) return body;

  const routerScripts =
    '<script src="/js/parent-magic-page-boot.js?v=' + MAGIC_VERSION + '"><\/script>\n' +
    '<script src="/js/parent-magic-router.js?v=' + MAGIC_VERSION + '"><\/script>\n';

  const tailMarker = '</body>';
  const tailIdx = body.lastIndexOf(tailMarker);
  if (tailIdx === -1) return body;
  return body.slice(0, tailIdx) + routerScripts + body.slice(tailIdx);
}

function bumpMagicAssetVersions(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  const path = normalizeHtmlPath(reqPath);
  if (!isMagicPath(path)) return body;
  return body
    .replace(/\/css\/app-view-toggle\.css\?v=\d+/g, '/css/app-view-toggle.css?v=' + MAGIC_VERSION)
    .replace(/\/css\/parent-magic-common\.css\?v=\d+/g, '/css/parent-magic-common.css?v=' + MAGIC_VERSION)
    .replace(/\/js\/parent-magic-auto\.js\?v=[^"']+/g, '/js/parent-magic-auto.js?v=' + MAGIC_VERSION)
    .replace(/\/js\/app-view-mode\.js\?v=[^"']+/g, '/js/app-view-mode.js?v=' + MAGIC_VERSION);
}

/** Ensure magic CSS/JS even when HTML already embeds parent-magic-shell.js (planning, rewards, …). */
function ensureMagicShellAssets(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  const path = normalizeHtmlPath(reqPath);
  if (!isMagicPath(path)) return body;
  body = bumpMagicAssetVersions(body, reqPath);

  const cssToEnsure = [
    { needle: 'parent-bottom-nav.css', tag: '<link rel="stylesheet" href="/css/parent-bottom-nav.css?v=' + MAGIC_VERSION + '">' },
    { needle: 'parent-magic-3d.css', tag: '<link rel="stylesheet" href="/css/parent-magic-3d.css?v=' + MAGIC_VERSION + '">' },
    { needle: 'parent-magic-common.css', tag: '<link rel="stylesheet" href="/css/parent-magic-common.css?v=' + MAGIC_VERSION + '">' },
    { needle: 'app-view-toggle.css', tag: '<link rel="stylesheet" href="/css/app-view-toggle.css?v=' + MAGIC_VERSION + '">' },
  ];

  const headClose = body.indexOf('</head>');
  if (headClose !== -1) {
    let cssInject = '';
    cssToEnsure.forEach(function (item) {
      if (!body.includes(item.needle)) cssInject += item.tag + '\n';
    });
    if (cssInject) {
      body = body.slice(0, headClose) + cssInject + body.slice(headClose);
    }
  }

  const scriptsToEnsure = [
    { needle: 'parent-magic-auto.js', tag: '<script src="/js/parent-magic-auto.js?v=' + MAGIC_VERSION + '"><\/script>\n' },
    { needle: 'parent-magic-bootstrap.js', tag: '<script src="/js/parent-magic-bootstrap.js?v=' + MAGIC_VERSION + '"><\/script>\n' },
  ];

  scriptsToEnsure.forEach(function (item) {
    if (body.includes(item.needle)) return;
    const shellIdx = body.indexOf('parent-magic-shell.js');
    if (shellIdx !== -1) {
      const lineStart = body.lastIndexOf('<script', shellIdx);
      if (lineStart !== -1) {
        body = body.slice(0, lineStart) + item.tag + body.slice(lineStart);
        return;
      }
    }
    const bodyClose = body.lastIndexOf('</body>');
    if (bodyClose !== -1) {
      body = body.slice(0, bodyClose) + item.tag + body.slice(bodyClose);
    }
  });

  return body;
}

function injectParentMagicHtml(body, reqPath) {
  if (typeof body !== 'string' || !body.includes('<html')) return body;
  body = ensureMagicShellAssets(body, reqPath);
  if (body.includes(MAGIC_INJECT_MARKER) || body.includes('parent-magic-shell.js')) return body;

  const path = normalizeHtmlPath(reqPath);
  if (!isMagicPath(path)) return body;

  const cssBlock = [
    MAGIC_INJECT_MARKER,
    '<link rel="stylesheet" href="/css/parent-bottom-nav.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/parent-magic-3d.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/parent-magic-common.css?v=' + MAGIC_VERSION + '">',
    '<link rel="stylesheet" href="/css/app-view-toggle.css?v=' + MAGIC_VERSION + '">',
  ].join('\n');

  const scriptBlock = [
    '<script src="/js/nav-config.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/app-view-mode.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/planning-back-nav.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-page-hubs.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-page-boot.js?v=' + MAGIC_VERSION + '"><\/script>',
    '<script src="/js/parent-magic-router.js?v=' + MAGIC_VERSION + '"><\/script>',
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

function maybeSetNoindexHeader(res, reqPath) {
  if (!isSeoIndexable(normalizeSeoPath(reqPath))) {
    res.setHeader('X-Robots-Tag', 'noindex');
  }
}

function shouldInjectNativeDebug(req) {
  if (process.env.NATIVE_DEBUG_OVERLAY === 'true') return true;
  if (req && req.query && String(req.query.native_debug) === '1') return true;
  return false;
}

function isAndroidWebViewRequest(req) {
  if (!req || typeof req.get !== 'function') return false;
  const ua = req.get('user-agent') || '';
  return /Android/i.test(ua) && /wv/i.test(ua);
}

function isAndroidClassicDashboard(req, reqPath) {
  return isAndroidWebViewRequest(req) && normalizeHtmlPath(reqPath) === '/dashboard';
}

function stripAndroidGpuHtml(body) {
  if (typeof body !== 'string') return body;
  return body.replace(
    /<link\b[^>]*href="[^"]*(?:parent-magic-3d|parent-magic-common|dashboard-magic|dashboard-warmth|dashboard-polish)\.css[^"]*"[^>]*>\s*/gi,
    ''
  );
}

function stripAndroidMagicBoot(body) {
  if (typeof body !== 'string') return body;
  return body
    .replace(/<style id="parent-magic-early-style">[\s\S]*?<\/style>\s*/gi, '')
    .replace(/<script id="parent-magic-early-boot">[\s\S]*?<\/script>\s*/gi, '');
}

const ANDROID_DASHBOARD_SCRIPT_FRAGMENTS = [
  'journey-celebration',
  'journey-coach',
  'dashboard-sse',
  'sse-client',
  'dashboard-tour',
  'survey-popup',
  'engine-coach',
  'engine-client',
  'engine-voice',
  'dashboard-home-hub',
  'home-bump-time',
  'activation-program-banner',
  'preview-shell',
  'dashboard-weekly-story',
  'for-dig-outcome-banner',
  'journey-first-week',
  'journey-parent-ack',
  'journey-context-client',
  'parent-magic-auto',
  'parent-magic-bootstrap',
  'parent-magic-page-boot',
  'parent-magic-router',
  'parent-magic-shell',
  'parent-magic-page-hubs',
  'dashboard-polish',
  'dashboard-daily-summary',
  'help-journey-tip',
];

function stripAndroidHeavyScripts(body, reqPath) {
  if (typeof body !== 'string') return body;
  if (normalizeHtmlPath(reqPath) !== '/dashboard') return body;
  let out = body;
  ANDROID_DASHBOARD_SCRIPT_FRAGMENTS.forEach(function (frag) {
    const re = new RegExp('<script\\b[^>]*src="[^"]*' + frag + '[^"]*"[^>]*>\\s*</script>\\s*', 'gi');
    out = out.replace(re, '');
  });
  return out;
}

function injectParentMagicStack(body, reqPath, req) {
  if (isAndroidClassicDashboard(req, reqPath)) return body;
  body = injectEarlyMagicHtml(body, reqPath);
  body = injectParentMagicRouter(body, reqPath);
  body = injectParentMagicHtml(body, reqPath);
  return ensureMagicShellAssets(body, reqPath);
}

function applyAndroidWebViewHardening(body, reqPath, req) {
  if (!isAndroidWebViewRequest(req)) return body;
  body = stripAndroidGpuHtml(body);
  if (isAndroidClassicDashboard(req, reqPath)) {
    body = stripAndroidMagicBoot(body);
  }
  body = stripAndroidHeavyScripts(body, reqPath);
  return body;
}

function ensureNativeDebugAssets(body) {
  if (typeof body !== 'string') return body;
  const DEBUG_JS = '/js/native-debug.js?v=1.0.5';
  const DEBUG_CSS = '/css/native-debug.css?v=1.0.4';
  if (!body.includes('native-debug.js')) {
    const tailMarker = '</body>';
    const idx = body.lastIndexOf(tailMarker);
    if (idx !== -1) {
      body = body.slice(0, idx) +
        '<script src="' + DEBUG_JS + '"><\/script>\n' +
        body.slice(idx);
    }
  }
  if (!body.includes('native-debug.css')) {
    const headMarker = '<head>';
    const idx = body.indexOf(headMarker);
    if (idx !== -1) {
      body = body.slice(0, idx + headMarker.length) + '\n' +
        '<link rel="stylesheet" href="' + DEBUG_CSS + '">\n' +
        body.slice(idx + headMarker.length);
    }
  }
  return body;
}

function injectPlatformHtml(body, reqPath, req) {
  if (typeof body !== 'string') return body;
  const injectDebug = shouldInjectNativeDebug(req);
  body = injectNoindexMeta(body, reqPath);
  if (body.includes(INJECT_MARKER)) {
    body = injectParentMagicStack(body, reqPath, req);
    return applyAndroidWebViewHardening(injectDebug ? ensureNativeDebugAssets(body) : body, reqPath, req);
  }

  const headMarker = '<head>';
  const tailMarker = '</body>';

  const headParts = [INJECT_MARKER];
  headParts.push(
    '<script>(function(){try{var c=typeof Capacitor!=="undefined"?Capacitor:null;' +
      'if(c&&c.isNativePlatform&&c.isNativePlatform()){' +
      'window.WEBVIEW_SERVER_URL=location.origin;' +
      'var el=document.documentElement;el.classList.add("is-native");' +
      'if(c.getPlatform&&c.getPlatform()==="android"){' +
      'el.classList.add("is-native-android");' +
      'el.classList.remove("parent-magic-early","parent-theme-dark","parent-theme-light");' +
      'function _stripGpuCss(){try{document.querySelectorAll(\'link[rel="stylesheet"]\').forEach(function(l){var h=l.href||"";if(/parent-magic-3d|parent-magic-common|dashboard-magic|dashboard-polish|dashboard-warmth/.test(h))l.remove();});}catch(e){}}' +
      '_stripGpuCss();if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",_stripGpuCss);' +
      'new MutationObserver(_stripGpuCss).observe(document.documentElement,{childList:true,subtree:true});' +
      'window.addEventListener("error",function(ev){try{fetch("/api/client-log",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({channel:"android_stability",step:"window_error",detail:{message:ev.message,source:ev.filename,line:ev.lineno},ts:Date.now(),native:true,android:true}),keepalive:true});}catch(e){}});' +
      'window.addEventListener("unhandledrejection",function(ev){try{fetch("/api/client-log",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({channel:"android_stability",step:"unhandled_rejection",detail:{reason:String(ev.reason&&(ev.reason.message||ev.reason))},ts:Date.now(),native:true,android:true}),keepalive:true});}catch(e){}});' +
      '}' +
      '}}catch(e){}})();<\/script>'
  );
  if (!/\/js\/platform\.js/i.test(body)) {
    headParts.push('<script src="/js/platform.js?v=' + RELEASE_TAG + '"><\/script>');
  }
  headParts.push(
    '<script src="/js/package-access-cache.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/features-cache.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/device-mode.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/session-gate.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/analytics-shim.js?v=' + RELEASE_TAG + '"><\/script>',
    '<script src="/js/platform-theme.js?v=' + RELEASE_TAG + '"><\/script>'
  );
  if (injectDebug) {
    headParts.push('<link rel="stylesheet" href="/css/native-debug.css?v=1.0.4">');
  }
  headParts.push(
    '<link rel="stylesheet" href="/css/platform-native.css?v=1.0.9">',
    '<link rel="stylesheet" href="/css/platform-tablet.css?v=1.0.0">',
    '<link rel="stylesheet" href="/css/platform-gating.css?v=' + RELEASE_TAG + '">',
    '<link rel="stylesheet" href="/css/parent-tab-bar.css?v=' + RELEASE_TAG + '">'
  );
  const headInject = headParts.join('\n') + '\n';

  const bodyInject =
    (injectDebug ? '<script src="/js/native-debug.js?v=1.0.5"><\/script>\n' : '') +
    '<script src="/js/apple-sign-in-diagnostics.js?v=2026-06-22c"><\/script>\n' +
    '<script src="/js/crash-reporter.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/deep-link-router.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parental-gate.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/nav-config.js?v=' + RELEASE_TAG + '"><\/script>\n' +
    '<script src="/js/referral-share.js?v=' + RELEASE_TAG + '"><\/script>\n' +
    '<script src="/js/native-tab-bar.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parent-nav-sidebar.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parent-nav-header.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/billing-ui.js?v=' + RELEASE_TAG + '" defer><\/script>\n' +
    '<script src="/js/parent-avatar-menu.js?v=' + RELEASE_TAG + '" defer><\/script>\n';

  const headIdx = body.indexOf(headMarker);
  if (headIdx !== -1) {
    body = body.slice(0, headIdx + headMarker.length) + '\n' + headInject + body.slice(headIdx + headMarker.length);
  }

  const tailIdx = body.lastIndexOf(tailMarker);
  if (tailIdx !== -1) {
    body = body.slice(0, tailIdx) + bodyInject + body.slice(tailIdx);
  }

  body = injectParentMagicStack(body, reqPath, req);
  body = injectDebug ? ensureNativeDebugAssets(body) : body;
  return applyAndroidWebViewHardening(body, reqPath, req);
}

function platformHtmlInject(req, res, next) {
  const originalSend = res.send;
  res.send = function (body) {
    const ct = res.get('Content-Type') || '';
    if ((ct.includes('text/html') || (typeof body === 'string' && body.trim().startsWith('<!'))) && typeof body === 'string') {
      maybeSetNoindexHeader(res, req.path);
      body = injectPlatformHtml(body, req.path, req);
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
      maybeSetNoindexHeader(self, req.path);
      self.send(injectPlatformHtml(html, req.path, req));
      if (cb) cb(null);
    });
  };

  next();
}

module.exports = platformHtmlInject;
module.exports.shouldInjectNativeDebug = shouldInjectNativeDebug;
module.exports.isAndroidWebViewRequest = isAndroidWebViewRequest;
module.exports.stripAndroidGpuHtml = stripAndroidGpuHtml;
module.exports.isAndroidClassicDashboard = isAndroidClassicDashboard;
module.exports.injectParentMagicStack = injectParentMagicStack;
module.exports.applyAndroidWebViewHardening = applyAndroidWebViewHardening;
module.exports.injectPlatformHtml = injectPlatformHtml;
module.exports.injectParentMagicHtml = injectParentMagicHtml;
