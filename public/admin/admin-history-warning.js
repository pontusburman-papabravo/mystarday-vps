/**
 * Shared admin banner after server migration — limited activity history (~21 days).
 * Does NOT compute history dynamically; static copy only.
 */
(function () {
  'use strict';

  const MESSAGE =
    'Historik begränsad efter serverbyte. Databasen har cirka 21 dagars aktivitetshistorik. ' +
    'Mått märkta 30 dagar eller mer kan vara ofullständiga. Retention Day 30/60 och kohorter ' +
    'längre än 3 veckor är inte tillförlitliga förrän tillräcklig historik finns.';

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function historyLimitedWarningHtml() {
    return (
      '<div class="admin-history-warning rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">' +
      escapeHtml(MESSAGE) +
      '</div>'
    );
  }

  function setHistoryLimitedWarning(containerId, show) {
    const el = document.getElementById(containerId);
    if (!el) return;
    if (show) {
      el.innerHTML = historyLimitedWarningHtml();
      el.classList.remove('hidden');
    } else {
      el.innerHTML = '';
      el.classList.add('hidden');
    }
  }

  function isLongOverviewPeriod(period) {
    return period === '30d' || period === '365d';
  }

  function isLongSubscriptionPeriod(period) {
    return period === '30d' || period === '90d';
  }

  function isLongTrendDays(days) {
    return Number(days) >= 30;
  }

  function isLongActivationWindow(windowDays) {
    return windowDays === 30 || windowDays === 60;
  }

  window.AdminHistoryWarning = {
    MESSAGE,
    historyLimitedWarningHtml,
    setHistoryLimitedWarning,
    isLongOverviewPeriod,
    isLongSubscriptionPeriod,
    isLongTrendDays,
    isLongActivationWindow,
  };
})();
