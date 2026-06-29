// skeleton.js — Shimmer loading states for Capacitor (iOS/Android).
// On web (non-native), all skeleton functions are no-ops so skeletons don't
// interfere with the web experience. Skeletons are targeted at App Store reviewers
// who see the loading state FIRST in a webview — a polished skeleton reads as
// "real native app", a blank or spinner reads as "web wrapper".

'use strict';

// ── Platform detection ─────────────────────────────────────
// skeleton.js loads early (before child-dashboard.js / dashboard.js).
// window.Platform is set in platform.js, which loads in <head> before any body content.
// If platform.js hasn't run yet, check navigator.userAgent as a fallback.
const Skeleton = {
  isNative: (function () {
    if (typeof window !== 'undefined' && window.Platform && typeof window.Platform.isNative === 'function') {
      return window.Platform.isNative();
    }
    return false;
  })(),

  // Threshold in ms. If data loads faster than this, skeleton stays invisible
  // (avoids flicker on fast connections). Set to 0 to always show briefly.
  minDisplayMs: 80,
  _startTime: null,
};

// ── Internal helpers ───────────────────────────────────────

function el(selector) {
  return document.querySelector(selector);
}

function els(selector) {
  return document.querySelectorAll(selector);
}

function $html(el, html) {
  if (!el) return;
  el.innerHTML = html;
}

// Wrap content in skeleton-fade-in + loaded class
function fadeInContent(el, content) {
  if (!el) return;
  $html(el, content);
  el.classList.add('skeleton-fade-in');
  el.classList.add('loaded');
}

function fadeInContentRaw(el, content) {
  if (!el) return;
  el.innerHTML = content;
  el.style.opacity = '0';
  // Trigger reflow
  void el.offsetWidth;
  el.style.transition = 'opacity 0.35s ease';
  el.style.opacity = '1';
}

// ── Child dashboard skeletons ───────────────────────────────

// Renders shimmer skeleton for the schedule view.
function renderChildScheduleSkeleton() {
  // Only show in Capacitor (app store / App Review)
  if (!Skeleton.isNative) return;

  const container = el('#scheduleView');
  if (!container) return;

  $html(container, `
    <div class="skeleton-container" style="margin-bottom:12px;">
      <!-- Progress bar skeleton -->
      <div class="skeleton skeleton-progress w-full mb-2" style="height:14px; border-radius:999px;"></div>
    </div>
    <div class="space-y-3">
      <!-- NOW card skeleton -->
      <div class="skeleton skeleton-now-card mb-4"></div>
      <!-- Activity row skeletons -->
      <div class="skeleton skeleton-row"></div>
      <div class="skeleton skeleton-row"></div>
      <div class="skeleton skeleton-row"></div>
      <div class="skeleton skeleton-row"></div>
      <div class="skeleton skeleton-row"></div>
    </div>
  `);
}

// Renders shimmer skeleton for Skattkammaren (rewards tab).
function renderChildRewardsSkeleton() {
  if (!Skeleton.isNative) return;

  const loadingEl = el('#skattkammarLoading');
  if (loadingEl) loadingEl.style.display = 'none';

  const container = el('#skattkammarView');
  if (!container) return;

  $html(container, `
    <div class="skatt-banner" style="margin-bottom:20px; position:relative; overflow:hidden; min-height:120px; background:linear-gradient(135deg,#1a0533,#2d0a5e,#1a0533); border-radius:28px; padding:24px 20px;">
      <div class="skeleton" style="width:80px; height:80px; border-radius:16px; margin:0 auto 12px; background:rgba(255,255,255,0.1);"></div>
      <div class="skeleton" style="width:140px; height:48px; border-radius:14px; margin:0 auto; background:rgba(255,255,255,0.1);"></div>
    </div>
    <div class="skatt-section">
      <div class="skatt-section-header">
        <div class="skeleton" style="width:36px; height:36px; border-radius:12px;"></div>
        <div class="skeleton" style="flex:1; height:20px; border-radius:8px; max-width:200px;"></div>
      </div>
      <div class="skatt-section-body">
        <div class="skeleton-grid" style="grid-template-columns:repeat(3,1fr); gap:10px;">
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
          <div class="skeleton" style="height:100px; border-radius:16px;"></div>
        </div>
      </div>
    </div>
  `);
  container.style.display = '';
}

// ── Parent dashboard skeletons ─────────────────────────────

// Renders shimmer skeleton for the child cards grid.
function renderParentDashboardSkeleton() {
  if (!Skeleton.isNative) return;

  const grid = el('#childCardsGrid');
  if (!grid) return;

  // Replace the static "Laddar…" text with shimmer cards
  $html(grid, `
    <div class="skeleton-grid" style="gap:12px;">
      <div class="skeleton skeleton-child-card"></div>
      <div class="skeleton skeleton-child-card"></div>
      <div class="skeleton skeleton-child-card"></div>
    </div>
  `);
}

// Renders shimmer skeleton for a single child card (used when expanding)
function renderChildCardSkeleton() {
  if (!Skeleton.isNative) return;
  return `
    <div class="skeleton skeleton-child-card" style="height:88px; margin-bottom:12px;"></div>
  `;
}

// ── Activity list skeleton (parent schedule editor) ─────────

function renderActivityListSkeleton() {
  if (!Skeleton.isNative) return;

  const container = el('#scheduleContent');
  if (!container) return;

  $html(container, `
    <div class="skeleton-stack" style="padding:0 4px;">
      <div class="skeleton skeleton-section-header"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-section-header" style="margin-top:16px;"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-activity-item"></div>
      <div class="skeleton skeleton-activity-item"></div>
    </div>
  `);
}

// ── Error states ───────────────────────────────────────────

// Error state for child dashboard schedule
function showChildScheduleError(container, dateStr, devHint) {
  if (!container) return;
  const hintExtra = devHint
    ? '<p class="skeleton-error-hint" style="margin-top:8px;opacity:0.85">' + String(devHint).replace(/</g, '&lt;') + '</p>'
    : '';
  $html(container, `
    <div class="skeleton-error">
      <div class="skeleton-error-icon">🌟</div>
      <p class="skeleton-error-text">Hmm, något gick fel.</p>
      <p class="skeleton-error-hint">Försök igen — och kontrollera att wifi är på</p>
      ${hintExtra}
      <button class="skeleton-retry-btn" onclick="loadDay('${dateStr}', false)">
        🔄 Försök igen
      </button>
    </div>
  `);
}

// Error state for parent dashboard
function showParentDashboardError(container) {
  if (!container) return;
  $html(container, `
    <div class="skeleton-error">
      <div class="skeleton-error-icon">📡</div>
      <p class="skeleton-error-text">Kunde inte ladda.</p>
      <p class="skeleton-error-hint">Kontrollera din internetanslutning</p>
      <button class="skeleton-retry-btn" onclick="window.location.reload()">
        🔄 Ladda om sidan
      </button>
    </div>
  `);
}

// ── Timing gate ─────────────────────────────────────────────

// startSkeleton() + endSkeleton() pair to prevent flicker.
// Only shows skeleton if data hasn't arrived within minDisplayMs.
// Returns { timedOut, stopTimer } — call timedOut() to show skeleton,
// stopTimer() to cancel if data arrived fast.
function createSkeletonTimer(onShow) {
  let timer;
  let resolved = false;

  function stop() {
    resolved = true;
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function showIfNeeded() {
    if (resolved) return;
    resolved = true;
    if (timer) { clearTimeout(timer); timer = null; }
    if (typeof onShow === 'function') onShow();
  }

  timer = setTimeout(showIfNeeded, Skeleton.minDisplayMs);

  return { stop, showIfNeeded };
}

// ── Fade helpers ─────────────────────────────────────────────

// Call this when data arrives to smoothly replace skeleton with content.
// container: DOM element containing skeleton
// contentFn: function(container) -> sets innerHTML and applies fade
function replaceSkeletonWithContent(container, contentFn) {
  if (!container) return;
  contentFn(container);
  container.classList.add('skeleton-fade-in');
  container.classList.add('loaded');
}

// Convenience: show skeleton instantly, return timer controller
function showSkeletonNow(renderFn) {
  renderFn();
  return { stop: function() {} };
}

// ── Exposed API ─────────────────────────────────────────────
// These are the functions child-dashboard.js and dashboard.js call.

window.Skeleton = {
  // Child dashboard
  showChildScheduleSkeleton: renderChildScheduleSkeleton,
  showChildRewardsSkeleton: renderChildRewardsSkeleton,
  showChildScheduleError: showChildScheduleError,

  // Parent dashboard
  showParentDashboardSkeleton: renderParentDashboardSkeleton,
  showParentDashboardError: showParentDashboardError,
  showActivityListSkeleton: renderActivityListSkeleton,

  // Timing gate
  createTimer: createSkeletonTimer,
  isNative: function () { return Skeleton.isNative; },
};