/**
 * pwa-install.js — PWA installation guide for Min Stjärndag.
 *
 * Owns: Platform detection, install guide rendering, Android install prompt.
 * Does NOT own: Push subscriptions (push-manager.js), service worker (sw-register.js).
 *
 * Exposes window.PWAInstall with:
 *   render(containerId)   — inject platform-specific guide into element
 *   isNeeded()            — true if user should see install guide
 *   isIOS()               — true if iOS Safari (not standalone)
 *   isAndroid()           — true if Android Chrome (not standalone)
 *   isStandalone()        — true if already installed as PWA
 */

(function () {
  'use strict';

  // ─── Platform detection ──────────────────────────────────

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  function isAndroid() {
    return /Android/.test(navigator.userAgent);
  }

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      navigator.standalone === true
    );
  }

  function isChrome() {
    return /Chrome/.test(navigator.userAgent) && !/Edg|OPR/.test(navigator.userAgent);
  }

  // localStorage key for dismissed state
  const DISMISS_KEY = 'pwa_guide_dismissed';

  function pt(key, params) {
    return (typeof window.pt === 'function') ? window.pt(key, params) : key;
  }

  // Native iOS/Android apps are the primary install path — no web "add to home screen" prompts.
  function isNeeded() {
    return false;
  }

  // ─── Android install prompt ──────────────────────────────
  // Capture beforeinstallprompt early so it's available when render() is called
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    // Refresh any already-rendered Android buttons
    document.querySelectorAll('[data-pwa-android-btn]').forEach(function (btn) {
      btn.classList.remove('hidden');
    });
  });

  window.addEventListener('appinstalled', function () {
    _deferredPrompt = null;
    // Hide all install guides once installed
    document.querySelectorAll('[data-pwa-guide]').forEach(function (el) {
      el.classList.add('hidden');
    });
  });

  // ─── HTML templates ──────────────────────────────────────

  const SHARE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block w-4 h-4 align-middle" style="display:inline;vertical-align:middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>';
  const PLUS_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block w-4 h-4 align-middle" style="display:inline;vertical-align:middle;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>';

  function iOSGuideHTML() {
    return [
      '<div data-pwa-guide class="rounded-2xl p-4 mb-4 relative" style="background:#FFF3CD;border:2px solid #F5A623;">',
      '  <button onclick="window.PWAInstall._dismiss(this)" aria-label="' + pt('home.pwa.dismissAria') + '" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-sm" style="color:#5A4A1A;opacity:0.6;">✕</button>',
      '  <div class="flex items-start gap-3">',
      '    <span style="font-size:1.5rem;line-height:1;">📲</span>',
      '    <div class="flex-1">',
      '      <p class="font-bold text-sm mb-1" style="color:#1B2340;">' + pt('home.pwa.title') + '</p>',
      '      <p class="text-xs mb-3" style="color:#5A4A1A;">',
      '        ' + pt('home.pwa.iosLead') + '',
      '      </p>',
      '      <ol class="space-y-2">',
      '        <li class="flex items-center gap-2 text-xs" style="color:#1B2340;">',
      '          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold" style="background:#F5A623;color:#fff;display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:9999px;font-weight:700;">1</span>',
      '          <span>' + pt('home.pwa.iosStep1') + ' ' + SHARE_SVG + '</span>',
      '        </li>',
      '        <li class="flex items-center gap-2 text-xs" style="color:#1B2340;">',
      '          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold" style="background:#F5A623;color:#fff;display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:9999px;font-weight:700;">2</span>',
      '          <span>' + pt('home.pwa.iosStep2') + ' ' + PLUS_SVG + '</span>',
      '        </li>',
      '        <li class="flex items-center gap-2 text-xs" style="color:#1B2340;">',
      '          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-gold text-white flex items-center justify-center text-xs font-bold" style="background:#F5A623;color:#fff;display:inline-flex;align-items:center;justify-content:center;width:1.25rem;height:1.25rem;border-radius:9999px;font-weight:700;">3</span>',
      '          <span>' + pt('home.pwa.iosStep3') + '</span>',
      '        </li>',
      '      </ol>',
      '      <div class="mt-3 flex items-center gap-2" style="opacity:0.7;font-size:0.65rem;color:#5A4A1A;">',
      '        <span>⬇️ Animerad pil pekar mot Dela-knappen i din webbläsare</span>',
      '      </div>',
      '      <!-- Animated arrow hint -->',
      '      <div id="pwaShareArrow" style="text-align:center;margin-top:6px;">',
      '        <span style="display:inline-block;font-size:1.5rem;animation:pwaArrowBounce 1.2s ease-in-out infinite;">⬇️</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  function androidGuideHTML() {
    return [
      '<div data-pwa-guide class="rounded-2xl p-4 mb-4 relative" style="background:#FFF3CD;border:2px solid #F5A623;">',
      '  <button onclick="window.PWAInstall._dismiss(this)" aria-label="Stäng" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-sm" style="color:#5A4A1A;opacity:0.6;">✕</button>',
      '  <div class="flex items-start gap-3">',
      '    <span style="font-size:1.5rem;line-height:1;">📱</span>',
      '    <div class="flex-1">',
      '      <p class="font-bold text-sm mb-1" style="color:#1B2340;">Installera appen för bästa upplevelse</p>',
      '      <p class="text-xs mb-3" style="color:#5A4A1A;">',
      '        Installera Min Stjärndag på hemskärmen för snabb åtkomst och push-notiser.',
      '      </p>',
      '      <button data-pwa-android-btn ' +
        'class="' + (_deferredPrompt ? '' : 'hidden ') + 'px-4 py-2 rounded-xl font-bold text-sm transition-colors" ' +
        'style="background:#F5A623;color:#1B2340;font-weight:700;" ' +
        'onclick="window.PWAInstall._triggerAndroid(this)">',
      '        📲 Installera appen',
      '      </button>',
      '      <p data-pwa-android-fallback class="' + (_deferredPrompt ? 'hidden ' : '') + 'text-xs" style="color:#5A4A1A;">',
      '        Tryck på ⋮ (meny) i Chrome → <strong>"Lägg till på startskärmen"</strong>',
      '      </p>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  function desktopGuideHTML() {
    return [
      '<div data-pwa-guide class="rounded-2xl p-4 mb-4 relative" style="background:#FFF3CD;border:2px solid #F5A623;">',
      '  <button onclick="window.PWAInstall._dismiss(this)" aria-label="Stäng" class="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-sm" style="color:#5A4A1A;opacity:0.6;">✕</button>',
      '  <div class="flex items-start gap-3">',
      '    <span style="font-size:1.5rem;line-height:1;">💻</span>',
      '    <div class="flex-1">',
      '      <p class="font-bold text-sm mb-1" style="color:#1B2340;">Installera appen</p>',
      '      <p class="text-xs mb-2" style="color:#5A4A1A;">',
      '        Klicka på installationsikonen (⊕) i adressfältet eller via webbläsarens meny.',
      '      </p>',
      '      <button data-pwa-android-btn ' +
        'class="' + (_deferredPrompt ? '' : 'hidden ') + 'px-4 py-2 rounded-xl font-bold text-sm transition-colors" ' +
        'style="background:#F5A623;color:#1B2340;font-weight:700;" ' +
        'onclick="window.PWAInstall._triggerAndroid(this)">',
      '        📲 Installera appen',
      '      </button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('\n');
  }

  // ─── Trigger Android native prompt ──────────────────────

  function _triggerAndroid(btn) {
    if (!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(function (choiceResult) {
      if (choiceResult.outcome === 'accepted') {
        // appinstalled event will handle hiding
      }
      _deferredPrompt = null;
      // Update button to fallback text
      const guide = btn.closest('[data-pwa-guide]');
      if (guide) {
        const fallback = guide.querySelector('[data-pwa-android-fallback]');
        if (fallback) fallback.classList.remove('hidden');
        btn.classList.add('hidden');
      }
    });
  }

  // ─── Inject CSS animation ────────────────────────────────

  function injectStyles() {
    if (document.getElementById('pwa-install-styles')) return;
    const style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = [
      '@keyframes pwaArrowBounce {',
      '  0%, 100% { transform: translateY(0); }',
      '  50% { transform: translateY(6px); }',
      '}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─── Dismiss ─────────────────────────────────────────────

  function _dismiss(btn) {
    localStorage.setItem(DISMISS_KEY, '1');
    const guide = btn ? btn.closest('[data-pwa-guide]') : null;
    if (guide) guide.classList.add('hidden');
  }

  // ─── Public: render guide into a container ───────────────

  /**
   * Injects the appropriate install guide HTML into `container`.
   * Gate 2I (offline_pwa): async check — only renders if feature is available.
   * If already standalone, injects nothing and returns false.
   * Returns a Promise (resolves true/false) — callers should await.
   */
  async function render(container) {
    if (!container) return false;
    if (localStorage.getItem(DISMISS_KEY) === '1') return false;
    if (isStandalone()) {
      container.innerHTML = '';
      container.style.display = 'none';
      return false;
    }

    // Gate 2I: offline_pwa — only render if feature is available.
    // If the check fails (non-critical), render anyway.
    try {
      const resp = await fetch('/api/features', { credentials: 'include' });
      if (resp.ok) {
        const features = await resp.json();
        const slugs = features.map(function(f) { return f.slug; });
        if (!slugs.includes('offline_pwa')) return false; // feature off — skip
      }
    } catch (_) { /* non-critical — proceed with render */ }

    injectStyles();

    let html = '';
    if (isIOS()) {
      html = iOSGuideHTML();
    } else if (isAndroid()) {
      html = androidGuideHTML();
    } else {
      html = desktopGuideHTML();
    }

    container.innerHTML = html;
    container.style.display = '';
    return true;
  }

  // ─── Expose global API ───────────────────────────────────

  window.PWAInstall = {
    render: render,
    isNeeded: isNeeded,
    isIOS: isIOS,
    isAndroid: isAndroid,
    isStandalone: isStandalone,
    // Internal: called from inline onclick
    _triggerAndroid: _triggerAndroid,
    _dismiss: _dismiss,
  };

})();
