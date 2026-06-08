/**
 * Dashboard real-time updates via SSE — refreshes child cards on activity completion, star grants, schedule changes.
 * Does not own: authentication, API routing, SSE connection (sse-client.js).
 */

// ── SSE event handlers for parent dashboard ───────────────
    // Refresh dashboard cards when any family member completes an activity,
    // receives manual stars, or when the parent changes the schedule.
    let _sseDashTimer = null;
    function scheduleSSEDashRefresh() {
      if (_sseDashTimer) clearTimeout(_sseDashTimer);
      _sseDashTimer = setTimeout(async () => {
        _sseDashTimer = null;
        try { await loadDashboardCards(); } catch {}
      }, 500);
    }

    window.addEventListener('sse:DAILY_LOG_ITEM_COMPLETED', () => scheduleSSEDashRefresh());
    window.addEventListener('sse:STAR_GRANTED', () => scheduleSSEDashRefresh());
    window.addEventListener('sse:GOAL_PROGRESS_UPDATE', () => scheduleSSEDashRefresh());
    window.addEventListener('sse:SCHEDULE_UPDATED', () => {
      // Reload child cards so "Idag"-vyn reflects schedule changes immediately
      scheduleSSEDashRefresh();
    });

    // ── PIN warning: show banner when child makes 3 failed PIN attempts ────
    window.addEventListener('sse:PIN_FAILED_WARNING', (e) => {
      const { childName } = e.detail || {};
      if (!childName) return;
      // Show a dismissible banner at the top of the page
      let banner = document.getElementById('pinWarningBanner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'pinWarningBanner';
        banner.style.cssText = [
          'position: fixed; top: 16px; left: 50%; transform: translateX(-50%);',
          'z-index: 9999; min-width: 320px; max-width: 480px; width: 90%;',
          'background: #FFF9C4; border: 2px solid #F5A623; border-radius: 14px;',
          'padding: 14px 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);',
          'display: flex; align-items: center; gap: 12px; font-family: Outfit, sans-serif;',
        ].join('');
        document.body.appendChild(banner);
      }
      banner.innerHTML = `
        <span style="font-size: 1.5rem;">⚠️</span>
        <div style="flex: 1;">
          <strong style="color: #1B2340; font-size: 0.95rem;">${childName} försöker logga in</strong>
          <p style="color: #5A6178; font-size: 0.8rem; margin: 2px 0 0;">3 felaktiga PIN-försök — barnet kan behöva hjälp</p>
        </div>
        <button onclick="document.getElementById('pinWarningBanner').remove()"
          style="background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #5A6178; padding: 4px;">✕</button>
      `;
      // Auto-dismiss after 30 seconds
      setTimeout(() => { if (banner.parentNode) banner.remove(); }, 30000);
    });

    // ── Tidsbaserad uppdatering (var 60:e sekund) ─────────────
    // Re-renders pills so block transitions (09:00, 12:00, 17:00, 21:00) apply
    // without requiring a full API fetch — just re-runs renderDashboardCards()
    // which calls buildBlockPills() with fresh time.
    setInterval(() => {
      try {
        if (typeof renderDashboardCards === 'function' && dashboardStats) {
          renderDashboardCards();
        }
      } catch {}
    }, 60 * 1000);

    // ── Midnatts-reset ────────────────────────────────────────
    // Detect date change: reload full stats at midnight so blocks reset to gray
    // and yesterday's engångsaktiviteter are excluded automatically.
    let _lastDateStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
    setInterval(() => {
      const now = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm' });
      if (now !== _lastDateStr) {
        _lastDateStr = now;
        try { loadDashboardCards(); } catch {}
      }
    }, 30 * 1000); // check every 30s — catches midnight within 30s

    // ── Passiv push-prompt ────────────────────────────────────
    // Shows a non-intrusive banner to encourage push subscription.
    // Shown once per browser; dismissed state persisted in localStorage.
    // Never shown on iOS without PWA install (push requires installed PWA on iOS).
    setTimeout(async () => {
      try {
        const Push = window.PushManager_StarDay;
        if (!Push || !Push.isSupported()) return;
        if (Push.isIOS() && !Push.isStandalone()) return; // iOS: only in PWA mode
        if (localStorage.getItem('push_prompt_dismissed') === '1') return;

        const alreadySubscribed = await Push.isSubscribed();
        if (alreadySubscribed) return;

        const permStatus = Push.getPermission();
        if (permStatus === 'denied') return; // browser already denied — can't prompt

        // Render subtle banner
        const banner = document.createElement('div');
        banner.id = 'pushPromptBanner';
        banner.setAttribute('role', 'status');
        banner.style.cssText = [
          'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);',
          'z-index:9990;min-width:320px;max-width:480px;width:90%;',
          'background:#fff;border:2px solid #F5A623;border-radius:16px;',
          'padding:14px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.12);',
          'display:flex;align-items:center;gap:12px;font-family:Outfit,sans-serif;',
        ].join('');
        banner.innerHTML = `
          <span style="font-size:1.6rem;flex-shrink:0;">🔔</span>
          <div style="flex:1;min-width:0;">
            <p style="margin:0;font-weight:700;color:#1B2340;font-size:0.9rem;">Få push-notiser om barnen</p>
            <p style="margin:2px 0 0;color:#5A6178;font-size:0.78rem;">Vet direkt när ett barn bockar av eller vill lösa in en belöning.</p>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0;">
            <button id="pushPromptDismiss"
              style="background:none;border:1px solid #d1d5db;border-radius:8px;padding:6px 10px;font-size:0.75rem;cursor:pointer;color:#5A6178;">
              Senare
            </button>
            <button id="pushPromptAccept"
              style="background:#F5A623;border:none;border-radius:8px;padding:6px 12px;font-size:0.75rem;font-weight:700;cursor:pointer;color:#1B2340;">
              Slå på
            </button>
          </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('pushPromptDismiss').addEventListener('click', () => {
          localStorage.setItem('push_prompt_dismissed', '1');
          banner.remove();
        });

        document.getElementById('pushPromptAccept').addEventListener('click', async () => {
          banner.remove();
          const result = await Push.requestAndSubscribe();
          const granted = result === 'granted' || (result && result.status === 'granted');
          if (granted) {
            // Brief success toast
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9990;background:#10b981;color:#fff;padding:10px 20px;border-radius:12px;font-family:Outfit,sans-serif;font-weight:700;font-size:0.9rem;box-shadow:0 4px 16px rgba(0,0,0,0.15);';
            toast.textContent = '✅ Push-notiser aktiverade!';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          }
          localStorage.setItem('push_prompt_dismissed', '1');
        });

        // Auto-dismiss after 15s without interaction
        setTimeout(() => { if (document.getElementById('pushPromptBanner')) banner.remove(); }, 15000);
      } catch (err) {
        // Push prompt failure is non-fatal — swallow silently
      }
    }, 4000); // 4s delay: let page finish loading before showing prompt
