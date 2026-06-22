/**
 * parent-magic-page-boot.js — Registry + script loader for magic soft navigation.
 */
(function (global) {
  'use strict';

  var _handlers = {};
  var _loadedScripts = {};

  function scriptPath(src) {
    try {
      var u = new URL(src, global.location.origin);
      return u.pathname;
    } catch (_) {
      return String(src || '').split('?')[0];
    }
  }

  function isScriptLoaded(src) {
    var path = scriptPath(src);
    if (_loadedScripts[path]) return true;
    var scripts = global.document.scripts;
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scriptPath(scripts[i].src) === path) return true;
    }
    return false;
  }

  function loadScript(src) {
    var path = scriptPath(src);
    if (isScriptLoaded(src)) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var el = global.document.createElement('script');
      el.src = src;
      el.async = false;
      el.onload = function () {
        _loadedScripts[path] = true;
        resolve();
      };
      el.onerror = function () { reject(new Error('script_load_failed:' + src)); };
      global.document.body.appendChild(el);
    });
  }

  function ensureScripts(list) {
    var chain = Promise.resolve();
    (list || []).forEach(function (src) {
      chain = chain.then(function () { return loadScript(src); });
    });
    return chain;
  }

  function register(pageId, fn) {
    if (!pageId || typeof fn !== 'function') return;
    _handlers[pageId] = fn;
  }

  function run(pageId) {
    var fn = _handlers[pageId];
    if (!fn) return Promise.resolve();
    try {
      return Promise.resolve(fn());
    } catch (err) {
      return Promise.reject(err);
    }
  }

  global.ParentMagicPageBoot = {
    register: register,
    run: run,
    ensureScripts: ensureScripts,
    isScriptLoaded: isScriptLoaded,
  };
})(window);
