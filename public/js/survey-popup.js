/**
 * survey-popup.js
 * In-app survey popup for logged-in parents (Målgrupp A).
 * Shows once per session; respects server-side snooze/dismiss state.
 * Called after auth is confirmed in dashboard.js.
 */

(function () {
  'use strict';

  let _popupEl = null;

  /**
   * Get CSRF token from Auth module (localStorage) or fall back to csrf_token cookie.
   * window._csrfToken is never set — always use Auth instead.
   */
  function _getCsrfToken() {
    if (typeof Auth !== 'undefined' && Auth.getCsrfToken) return Auth.getCsrfToken();
    // Fallback: read csrf_token cookie directly
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? match[1] : '';
  }

  async function initSurveyPopup() {
    // Gate: only show popup if enkater feature is enabled for this family
    try {
      const res = await fetch('/api/features', { credentials: 'include' });
      if (res.ok) {
        const features = await res.json();
        const slugs = features.map(f => f.slug);
        if (!slugs.includes('enkater')) return;
      }
    } catch { /* fail open */ }

    // Small delay so dashboard content loads first
    await new Promise(r => setTimeout(r, 1800));

    let data;
    try {
      const res = await fetch('/api/surveys/popup/logged-in', {
        headers: { 'X-CSRF-Token': _getCsrfToken() },
        credentials: 'include',
      });
      if (!res.ok) return;
      data = await res.json();
    } catch { return; }

    if (!data.survey) return;
    const survey = data.survey;

    // Record 'shown' interaction
    _recordInteraction(survey.id, 'shown', null);

    _render(survey);
  }

  function _render(survey) {
    // Inject popup HTML into document body
    const div = document.createElement('div');
    div.id = 'surveyPopupOverlay';
    div.style.cssText = 'position:fixed;inset:0;z-index:var(--layer-modal-backdrop, 500);display:flex;align-items:flex-end;justify-content:center;padding:0 0 24px;pointer-events:none;';
    div.innerHTML = `
      <div id="surveyPopupCard" style="pointer-events:all;width:100%;max-width:420px;margin:0 12px;
        background:#fff;border-radius:24px 24px 24px 24px;box-shadow:0 8px 40px rgba(27,35,64,0.18);
        padding:24px;animation:surveySlideUp 0.35s cubic-bezier(0.34,1.56,0.64,1);">

        ${survey.contest_enabled && survey.contest_prize_description ? `
        <div style="background:linear-gradient(135deg,#FFF3D6,#fde68a);border-radius:14px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
          <span style="font-size:1.5rem">🎁</span>
          <span style="font-size:0.82rem;font-weight:600;color:#92400e;">Svara och tävla om ${_esc(survey.contest_prize_description)}!</span>
        </div>` : ''}

        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="font-size:1.8rem;flex-shrink:0;">📋</div>
          <div style="flex:1;">
            <p style="font-weight:700;font-size:1rem;color:#1B2340;margin:0 0 4px;">Vi vill höra din åsikt</p>
            <p style="font-size:0.85rem;color:#5A6178;margin:0;">Det tar bara 2 minuter — din feedback förbättrar appen.</p>
          </div>
          <button onclick="window._surveyPopupClose()" style="background:none;border:none;cursor:pointer;color:#9CA3AF;font-size:1.2rem;padding:0;line-height:1;flex-shrink:0;">✕</button>
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">
          <a href="/tyck/${_esc(survey.slug)}" onclick="window._surveyPopupAction('clicked')"
            style="display:block;background:#1B2340;color:#fff;text-align:center;padding:12px;border-radius:14px;
                   font-weight:600;font-size:0.9rem;text-decoration:none;transition:opacity .15s;"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            Svara nu →
          </a>
          <div style="display:flex;gap:8px;">
            <button onclick="window._surveyPopupAction('snoozed')"
              style="flex:1;background:#F3F4F6;border:none;cursor:pointer;padding:10px;border-radius:12px;
                     font-size:0.82rem;font-weight:600;color:#5A6178;">
              Påminn om 3 dagar
            </button>
            <button onclick="window._surveyPopupAction('dismissed')"
              style="flex:1;background:#F3F4F6;border:none;cursor:pointer;padding:10px;border-radius:12px;
                     font-size:0.82rem;font-weight:600;color:#5A6178;">
              Vill inte svara
            </button>
          </div>
        </div>
      </div>
    `;

    // Inject animation keyframe if not already present
    if (!document.getElementById('surveyPopupStyle')) {
      const style = document.createElement('style');
      style.id = 'surveyPopupStyle';
      style.textContent = `@keyframes surveySlideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}`;
      document.head.appendChild(style);
    }

    document.body.appendChild(div);
    _popupEl = div;

    // Store survey_id for interaction recording
    window._surveyPopupSurveyId = survey.id;
    // Track whether an explicit action (snoozed/clicked/dismissed-via-button) was already recorded
    window._surveyPopupActionRecorded = false;

    window._surveyPopupClose = function () {
      // Only record 'dismissed' if no other action was already recorded this session.
      // Without this guard, _surveyPopupAction('snoozed') → _surveyPopupClose() would
      // fire a second 'dismissed' that overwrites the snooze in DB, breaking the 3-day cooldown.
      if (!window._surveyPopupActionRecorded) {
        _recordInteraction(window._surveyPopupSurveyId, 'dismissed', null);
      }
      if (_popupEl) { _popupEl.style.opacity = '0'; _popupEl.style.transition = 'opacity .2s'; setTimeout(() => _popupEl?.remove(), 200); _popupEl = null; }
    };

    window._surveyPopupAction = function (action) {
      window._surveyPopupActionRecorded = true;
      _recordInteraction(window._surveyPopupSurveyId, action, action === 'snoozed' ? 3 : null);
      // Close popup UI without recording a second 'dismissed' (guarded above)
      window._surveyPopupClose();
    };
  }

  async function _recordInteraction(surveyId, action, snoozeDays) {
    try {
      await fetch('/api/surveys/popup/interaction', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _getCsrfToken() },
        body: JSON.stringify({ survey_id: surveyId, action, snooze_days: snoozeDays }),
      });
    } catch { /* non-fatal */ }
  }

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // Expose for dashboard.js to call after auth
  window.initSurveyPopup = initSurveyPopup;
})();
