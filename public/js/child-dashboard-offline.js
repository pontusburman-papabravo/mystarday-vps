/**
 * Child dashboard offline UI (Fas 8 F3a).
 * Banner + empty/error states for offline schema viewing.
 */
(function () {
  'use strict';

  function t(key, params) {
    return (typeof window.childT === 'function' ? childT(key, params)
      : (typeof window.cpt === 'function' ? cpt(key, params) : ''));
  }

let _offlineBanner = null;
const _offlineTimer = null;

function getOfflineBanner() {
  if (!_offlineBanner) {
    _offlineBanner = document.getElementById('offlineBanner');
  }
  return _offlineBanner;
}

function showOfflineBanner(msg) {
  const banner = getOfflineBanner();
  if (!banner) return;
  banner.innerHTML = `<span>📶</span><span>${msg}</span>`;
  banner.classList.remove('hidden');
  banner.classList.add('flex');
}

function hideOfflineBanner() {
  const banner = getOfflineBanner();
  if (!banner) return;
  banner.classList.add('hidden');
  banner.classList.remove('flex');
}

function showOfflineEmptyState(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="text-center py-12 bg-white rounded-2xl mt-2">
      <p class="text-4xl mb-3">📶</p>
      <p class="text-text-soft font-semibold">${t('offline.noConnection')}</p>
      <p class="text-text-soft text-sm mt-1">${t('offline.connectForSchedule')}</p>
    </div>`;
}

function showOfflineErrorState(container, dateStr) {
  if (!container) return;
  container.innerHTML = `
    <div class="text-center py-12 bg-white rounded-2xl mt-2">
      <p class="text-4xl mb-3">😕</p>
      <p class="text-text-soft">${t('offline.couldNotLoadSchedule')}</p>
      <button onclick="loadDay('${dateStr}')" class="mt-4 px-6 py-2 bg-gold text-white rounded-xl font-semibold">${t('common.retry')}</button>
    </div>`;
}

  window.showOfflineBanner = showOfflineBanner;
  window.hideOfflineBanner = hideOfflineBanner;
  window.showOfflineEmptyState = showOfflineEmptyState;
  window.showOfflineErrorState = showOfflineErrorState;
})();
