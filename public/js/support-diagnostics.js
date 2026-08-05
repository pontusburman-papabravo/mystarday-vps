/**
 * R0-06 — Settings support clipboard (no PII).
 */
(function () {
  'use strict';

  let _lastCopied = '';

  function collectClientContext() {
    let platform = 'web';
    if (window.Platform && typeof Platform.isNative === 'function' && Platform.isNative()) {
      if (Platform.isIOS && Platform.isIOS()) platform = 'ios';
      else if (Platform.isAndroid && Platform.isAndroid()) platform = 'android';
      else platform = 'native';
    }
    let deviceMode = 'parent';
    try {
      const dm = localStorage.getItem('stjarndag_device_mode');
      if (dm) deviceMode = dm;
    } catch (_) { /* ignore */ }
    const locale = document.documentElement.lang
      || (typeof window.getCurrentLocale === 'function' ? getCurrentLocale() : 'sv-SE');
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    let swController = '';
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        const u = navigator.serviceWorker.controller.scriptURL || '';
        swController = u.split('/').pop() || 'active';
      }
    } catch (_) { /* ignore */ }
    return {
      platform,
      device_mode: deviceMode,
      locale,
      viewport,
      sw_controller: swController,
    };
  }

  function setStatus(msg, isError) {
    const el = document.getElementById('supportDiagnosticsMsg');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('text-red-600', !!isError);
    el.classList.toggle('text-green-700', !isError && !!msg);
  }

  async function copyToClipboard() {
    const btn = document.getElementById('copySupportDiagnosticsBtn');
    if (btn) btn.disabled = true;
    setStatus('');
    try {
      if (!window.Auth || typeof Auth.api !== 'function') {
        throw new Error('auth_unavailable');
      }
      const client = collectClientContext();
      const res = await Auth.api('/api/account/support-diagnostics', {
        method: 'POST',
        body: JSON.stringify(client),
      });
      const text = res && res.clipboard_text ? res.clipboard_text : '';
      if (!text) throw new Error('empty_payload');
      _lastCopied = text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setStatus('Kopierat — klistra in i mejl till support.');
    } catch (err) {
      console.error('[support-diagnostics]', err);
      setStatus('Kunde inte kopiera. Försök igen.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function bindCopyButton() {
    const btn = document.getElementById('copySupportDiagnosticsBtn');
    if (!btn || btn.dataset.supportDiagBound === '1') return;
    btn.dataset.supportDiagBound = '1';
    btn.addEventListener('click', () => {
      copyToClipboard();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindCopyButton);
  } else {
    bindCopyButton();
  }

  window.SupportDiagnostics = {
    copyToClipboard,
    collectClientContext,
    getLastCopied: () => _lastCopied,
  };
})();
