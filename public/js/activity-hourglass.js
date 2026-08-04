/**
 * activity-hourglass.js — levererad Activity Hourglass v1 (UL-paket).
 * Källa: hourglass-component.js + hourglass.svg
 */
(function (global) {
  'use strict';

  function ActivityHourglass(svgElement) {
    if (!(svgElement instanceof SVGElement)) {
      throw new TypeError('ActivityHourglass requires an SVGElement.');
    }
    this.svg = svgElement;
    this.setState({ remainingSeconds: 1, durationSeconds: 1, state: 'idle' });
  }

  ActivityHourglass.prototype.setProgress = function setProgress(value) {
    const progress = Math.max(0, Math.min(1, Number(value) || 0));
    this.svg.style.setProperty('--progress', progress.toFixed(4));
  };

  ActivityHourglass.prototype.setRunning = function setRunning(isRunning) {
    this.svg.style.setProperty('--running', isRunning ? '1' : '0');
  };

  ActivityHourglass.prototype.setState = function setState(_ref) {
    const remainingSeconds = _ref.remainingSeconds;
    const durationSeconds = _ref.durationSeconds;
    const state = _ref.state;
    const duration = Math.max(1, Number(durationSeconds) || 1);
    const remaining = Math.max(0, Math.min(duration, Number(remainingSeconds) || 0));
    this.setProgress(1 - remaining / duration);
    this.setRunning(state === 'running' && remaining > 0);
  };

  function namespaceSvgMarkup(svgText, ns) {
    return svgText
      .replace(/\bid="([^"]+)"/g, 'id="' + ns + '-$1"')
      .replace(/url\(#([^)]+)\)/g, 'url(#' + ns + '-$1)');
  }

  let _svgTemplate = null;
  let _svgLoadPromise = null;
  let _nsCounter = 0;
  const _instances = new WeakMap();

  function loadSvgTemplate() {
    if (_svgTemplate) return Promise.resolve(_svgTemplate);
    if (!_svgLoadPromise) {
      _svgLoadPromise = fetch('/images/child/activity-timer/hourglass.svg')
        .then(function (r) {
          if (!r.ok) throw new Error('hourglass.svg load failed');
          return r.text();
        })
        .then(function (text) {
          _svgTemplate = text;
          return text;
        })
        .catch(function () {
          _svgTemplate = '';
          return '';
        });
    }
    return _svgLoadPromise;
  }

  function findMount(root) {
    if (!root) return null;
    if (root.dataset && root.dataset.hourglassMount === '1') return root;
    return root.querySelector('[data-hourglass-mount="1"]');
  }

  function mountHtml(sizeClass) {
    return (
      '<div class="activity-hourglass-mount ' + sizeClass + '" data-hourglass-mount="1" aria-hidden="true"></div>'
    );
  }

  function ensureMounted(mount) {
    if (!mount || mount.querySelector('svg')) {
      return Promise.resolve(mount);
    }
    return loadSvgTemplate().then(function (text) {
      if (!text || !mount.isConnected) return mount;
      const ns = 'ahg' + String(++_nsCounter);
      mount.innerHTML = namespaceSvgMarkup(text, ns);
      const svg = mount.querySelector('svg');
      if (svg instanceof SVGElement) {
        _instances.set(mount, new ActivityHourglass(svg));
      }
      return mount;
    });
  }

  function applyToRoot(root, remainingSeconds, durationSeconds, state) {
    const mount = findMount(root);
    if (!mount) return undefined;
    const duration = Math.max(1, Number(durationSeconds) || 1);
    let remaining = Math.max(0, Math.min(duration, Number(remainingSeconds) || 0));
    if (state === 'idle') {
      remaining = duration;
    } else if (state === 'finished') {
      remaining = 0;
    }

    function push() {
      const inst = _instances.get(mount);
      if (inst) {
        inst.setState({ remainingSeconds: remaining, durationSeconds: duration, state: state });
      }
    }

    if (mount.querySelector('svg')) {
      push();
      return undefined;
    }
    return ensureMounted(mount).then(push);
  }

  global.ActivityHourglass = ActivityHourglass;
  global.ActivityHourglassUI = {
    mountHtml: mountHtml,
    applyToRoot: applyToRoot,
    preload: loadSvgTemplate,
    namespaceSvgMarkup: namespaceSvgMarkup,
  };
})(typeof window !== 'undefined' ? window : globalThis);
