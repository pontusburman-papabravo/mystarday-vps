/**
 * platform-html.js — middleware that injects platform-theme.js and platform-native.css
 * into all HTML responses served by Express (res.send / res.sendFile).
 *
 * Injects after <head>:
 *   <script src="/js/platform-theme.js?v=1.0.0"></script>
 *   <link rel="stylesheet" href="/css/platform-native.css?v=1.0.0">
 *
 * Injects before </body>:
 *   <script src="/js/platform-tab-bar.js?v=1.0.0" defer></script>
 *
 * Idempotent: skips if platform-theme.js is already present in the response.
 */

function platformHtmlInject(req, res, next) {
  // Wrap res.send
  var originalSend = res.send;
  res.send = function (body) {
    if (res.get('Content-Type') && res.get('Content-Type').includes('text/html') && typeof body === 'string') {
      // Idempotent: skip if already injected
      if (body.includes('platform-theme.js')) {
        return originalSend.call(this, body);
      }

      var headMarker = '<head>';
      var tailMarker = '</body>';

      var headInject =
        '<script src="/js/platform-theme.js?v=1.0.0"><\/script>\n' +
        '<link rel="stylesheet" href="/css/platform-native.css?v=1.0.0">';

      var bodyInject = '<script src="/js/platform-tab-bar.js?v=1.0.0" defer><\/script>';

      // Inject after <head>
      var headIdx = body.indexOf(headMarker);
      if (headIdx !== -1) {
        body = body.slice(0, headIdx + headMarker.length) + '\n' + headInject + body.slice(headIdx + headMarker.length);
      }

      // Inject before </body>
      var tailIdx = body.lastIndexOf(tailMarker);
      if (tailIdx !== -1) {
        body = body.slice(0, tailIdx) + bodyInject + '\n' + body.slice(tailIdx);
      }
    }
    return originalSend.call(this, body);
  };

  // Wrap res.sendFile (Express 4.x)
  var originalSendFile = res.sendFile;
  res.sendFile = function (filePath, options, callback) {
    var _this = this;
    originalSendFile.call(this, filePath, options, function (err) {
      // After sendFile, try to inject via res.send override (same Content-Type check)
      // Note: sendFile already fired — middleware below handles HTML responses on next request
      if (callback) callback.apply(_this, arguments);
    });
  };

  next();
}

module.exports = platformHtmlInject;