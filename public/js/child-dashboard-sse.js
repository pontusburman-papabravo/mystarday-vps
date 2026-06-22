// child-dashboard-sse.js — SSE händelsehanterare för barnvyn
// Äger: lyssnar på server-push-händelser (schema, stjärnor, mål) och uppdaterar UI
// Äger INTE: API-anrop, renderingslogik (child-dashboard.js)

// ── SSE event handlers for child-dashboard ────────────────
// These listen for server-pushed events and refresh the relevant UI.
// We use a short debounce (300ms) so back-to-back events from the same
// action don't trigger multiple reloads.
let _sseReloadTimer = null;
function scheduleSSEReload() {
  if (_sseReloadTimer) clearTimeout(_sseReloadTimer);
  _sseReloadTimer = setTimeout(async () => {
    _sseReloadTimer = null;
    // Re-fetch the current day's log to update progress bars + activity cards
    if (typeof loadDay === 'function' && currentDate) {
      try { await loadDay(currentDate, false); } catch {}
    }
  }, 300);
}

let _sseStarTimer = null;
function scheduleSSEStarReload() {
  if (_sseStarTimer) clearTimeout(_sseStarTimer);
  _sseStarTimer = setTimeout(async () => {
    _sseStarTimer = null;
    // Reload rewards (updates star balance + goal progress bar)
    if (typeof loadRewards === 'function' && rewardsLoaded) {
      try { await loadRewards(); } catch {}
    } else {
      // Refresh goal bar in header even if skattkammaren isn't open
      try {
        const goalData = await Auth.api('/api/me/goal').catch(() => null);
        if (typeof updateGoalBar === 'function') updateGoalBar(goalData);
        // Update balance display
        const rewardsData = await Auth.api('/api/me/rewards').catch(() => null);
        if (rewardsData) {
          const bal = document.getElementById('totalStarBalance');
          if (bal) bal.textContent = `⭐ ${rewardsData.starBalance || 0}`;
        }
      } catch {}
    }
  }, 400);
}

window.addEventListener('sse:DAILY_LOG_ITEM_COMPLETED', () => scheduleSSEReload());
window.addEventListener('sse:SCHEDULE_UPDATED', () => scheduleSSEReload());
window.addEventListener('sse:STAR_GRANTED', () => {
  scheduleSSEReload();    // progress bar may change
  scheduleSSEStarReload(); // star balance definitely changes
  if (window.ChildRewardsEngine && typeof ChildRewardsEngine.flashStarEconomy === 'function') {
    ChildRewardsEngine.flashStarEconomy();
  }
});
window.addEventListener('sse:GOAL_PROGRESS_UPDATE', () => scheduleSSEStarReload());