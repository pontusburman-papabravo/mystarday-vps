/**
 * Min Stjärndag — Service Worker v271 // pragma: allowlist secret
 * v271: Landing hamburger menu as primary mobile login path
 * v270: Landing login entry — parent + child login visible in hero and nav
 * v269: SEO /faq + /kontakt indexable; founder counter visible in hero
 * v268: Landing page v2 — conversion-focused homepage refactor
 * v267: Admin prenumeration — legacy web payment UI borttagen, IAP-status endast
 * v266: Apple Sign In iPad — robust native name mapping (givenName/familyName)
 * v242: for-dig bugfix — native-tab-bar För dig, sw-register + versioning, outcome-banner feature gate
 * v199: avatar_url sparas vid PUT + direktsparning efter uppladdning
 * v198: window.Auth + avatar upload auth check fix
 * v196: Mobil PWA avatar — filväljare timeout, blob utan fetch(dataUrl)
 * v195: PWA barnavatar — Byt bild i child-settings + CSRF på upload/avatar
 * v194: Admin e-post — dagens nyhet mottagarval, newsletters-tabell
 * v191: Behåll barnväljare efter vuxenlogout (known_children + snapshot)
 * v190: Nytt barn efter vuxenlogin — direkt till onboarding, ingen dubbel PIN
 * v189: Befintligt barn på kopplad enhet — namn+PIN, ingen vuxenlogin
 * v188: Byt barn → alltid barnlistan (aldrig auto-hopp till PIN)
 * v187: add-child — kräv vuxenlogin direkt (ingen loop via Jag är barn)
 * v186: add-child efter Byt barn — avsluta barnsession, rensa pending, inget auto-hopp till PIN
 * v185: login — "Jag är barn" rensar add-child-pending; ?next= efter vuxenlogin
 * v184: Ta bort dubbel prompt vid PIN-byte (återanvänd verifierad PIN från steg 1)
 * v183: Föräldralås — unik PIN per vuxen (parent.parent_pin_hash)
 * v182: Föräldralås UI — ett steg i taget (välj → bekräfta), smalare keypad
 * v181: Byt barn — korrekt utloggning (cookie secure-flagga + DeviceMode child)
 * v180: föräldralås-PIN i onboarding + Familj-sida; vuxenlogin → dashboard (DeviceMode)
 * v179: add-child — always show nytt/befintligt val; remove direct onboarding redirect
 * v178: add-child barnväljare — nytt/befintligt val + vuxen-PIN-gate (verify-pin-picker)
 * v177: child login redirect loop — verify child cookie after PIN; COOKIE_SECURE env; session type check
 * v176: add second child — child_creation_wizard core feature + always show add-child on barnväljare
 * v175: birthday-picker — parse ISO dates + fix day select layout on child-settings desktop
 * v174: daily-log + reports — include dom-utils.js (renderChildAvatar missing → "Kunde inte ladda barn")
 * v173: Skanna/lägg till vuxen (namn, e-post, roll) + dubblettkoll barn/vuxen
 * v172: Lägg till barn → onboarding flow=add-child (barnväljare + picker parent hydrate)
 * v171: Barnväljare mockup — subtitle, Lägg till ett barn-rad + CSS
 * v203: Native push via Capacitor bridge (remote WebView), push_notiser core
 * v167: Sprint 18 Google UI, 22 deep links, 19 FCM send, 26 dashboard polish, 5b PIN haptik
 * v166: Release OS sprint 1–26 agent batch — device_mode, session-gate, native-tab-bar,
 *       crash-reporter, app-config, child API block, platform gating full
 * v165: Release OS pre-work — platform.js gating APIs, platform-theme via Platform,
 *       platform-gating.css scaffold, upload sanitizeFilename fix, gate0 green.
 * v162: Fix SyntaxError in admin-families.js:693 — email validation regex
 *       had escaped closing slash (\/), preventing file from parsing →
 *       loadFamilies/loadMessages never defined → Familjer/Meddelanden/Bibliotek
 *       stuck on "Laddar..." forever. One-char fix: removed stray backslash.
 * v161: Admin desktop infinite loading fix — apiLimiter no longer counts
 *       authenticated requests (req.user.id skip); AbortController timeout
 *       added to loadFamilies, loadMessages, loadDefaultTemplates so requests
 *       fail fast instead of hanging if DB is slow.
 * v159: Admin mobile fix — exempt static assets from global rate limiter (they
 *       exhausted the 200 req/min IP budget on admin panel load → 429 on API
 *       calls → redirect to /login). Admin-core.js catch block now only redirects
 *       on 401/403 (auth failures), not 429/500/network errors.
 * v150: Barnlogin Phase 2 — avatar upload display confirmation.
 *       Avatar upload backend already in place (SW v140: POST /api/upload/avatar).
 *       child-login.js: renderChildAvatar() already handles avatar_url → emoji → ⭐
 *         fallback chain in both child selection list and PIN screen avatar.
 *       child-login-magic.css: cl-avatar-ring img and .cl-pin-avatar img already styled.
 *       SW bump v149→v150 for cache invalidation.
 * v149: Barnlogin Phase 1 — "Stjärnutforskare" redesign.
 *       Skärm 1: login.html already has role cards (kid/parent).
 *       Skärm 2: child-login.html = 2-view flow (select child → PIN with custom keypad).
 *       child-login-magic.css — night theme styles + animated stars/clouds.
 *       child-login.js — keypad logic, child list from localStorage + /api/auth/me,
 *         POST /api/auth/child-login (unchanged), lockout UI preserved.
 *       onboarding.js: flow=add-child bypasses onboarding_completed guard,
 *         skips invite step, redirects to /child-login after complete.
 *       SW bump v148→v149 for cache invalidation.
 * v148: Kontohantering F — Admin-stöd.
 *       GET /api/admin/families-grouped includes hasPassword/hasAppleLinked/appleEmail per parent.
 *       PUT /api/admin/parents/:id/email — admin email change with reason + audit.
 *       DELETE /api/admin/parents/:id/apple-link — admin Apple unlink with reason + audit.
 *       GET /api/admin/families/:familyId/audit-log — last 20 admin actions.
 *       Admin panel: auth badges (🔑🍎⚠️📧), change-email modal, unlink-apple modal, audit panel.
 *       reset-parent-password now logs to admin_audit_log with auth context.
 *       Email sent to old + new address on admin email change.
 * v138: Kontohantering C — "Konto & inloggning" UI på inställningssidan.
 *       new /js/settings-account.js (dynamic rendering based on accountAuth).
 *       settings.html: accountSection injected above legacy password section.
 *       showAppleAuthUI() helper (Platform.isIOS()) for Apple linking UI gates.
 *       Add-password success → replaces section with change-password form.
 * v137: Kontohantering B — backend-grund.
 *       GET /api/auth/me includes accountAuth object (hasPassword, hasAppleLinked,
 *       email, appleEmail, canUnlinkApple).
 *       POST /api/account/set-password for Apple-only accounts.
 *       email_change_token migration deployed.
 * v136: Login "magisk natt" redesign — new login-magic.css/js, login.html visual overhaul,
 *       gradient navy→lila→rosa starfield, role cards (kid/parent), parent form reveal,
 *       safe-area insets, all existing auth logic preserved. SW bump for cache invalidation.
 * v134: Native vs Webb — platform-theme.js (synkront IIFE, Capacitor.isNativePlatform()),
 *       platform-native.css (CSS gates för safe-area, hamburger, web payment),
 *       platform-html.js middleware injecterar scripts i alla HTML responses.
 *       Klasser .web-payment-only på upgrade.html-prissektion.
 * v132: Hotfix — registrering kraschade med CHECK constraint violation. auth.js INSERT
 *       använde 'trial'/'beta' men family_subscription_status_check tillåter bara
 *       'none'|'active'|'expired'|'grace_period'|'cancelled'. Ändrat till 'none'.
 * v131: Hotfix — batch-ratings query referenced non-existent daily_log_item_rating table,
 *       crashing child daily-log endpoint. Fixed to use actual `rating` table.
 * v130: Barnvy-bugfix — humörbetyg nu styrs av show_mood_rating (per-child parent setting),
 *       INTE kanslo_tracking (dev-flagga). Serialiserade avbockningar + coalesced loadDay
 *       för att eliminera race conditions vid snabba kryss. Batch-ratings i GET /api/me/daily-log.
 * v129: Release prep — lifetime free för topp 200 familjer.
 *       Auth.js: SELECT COUNT(*) → is_lifetime_free in same transaction.
 *       Familien #1–200: is_lifetime_free=true, Inga prenumerationskrav.
 *       Familien #201+: normal trial/subscription-flöde via RevenueCat.
 * v128: RevenueCat webhook endpoint (POST /api/iap/webhook) — subscription_status sync
 *       from RevenueCat events (INITIAL_PURCHASE/RENEWAL → active, CANCELLATION → cancelled,
 *       EXPIRATION → expired, BILLING_ISSUE → grace_period). Lifetime-free guard prevents
 *       webhook from overriding free status. HMAC-SHA256 Authorization verification.
 * v127: RevenueCat IAP infrastructure — iap-manager.js (native SDK init, checkSubscriptionStatus),
 *       /api/auth/me includes is_lifetime_free from family row,
 *       auth.js getFamilyId() for RevenueCat appUserID,
 *       REVENUECAT_API_KEY in .env.example.
 *       NOTE: @revenuecat/purchases-capacitor npm blocked by Polsia npm policy —
 *       must be resolved before native builds can use IAP.
 * v126: DELETE /api/family/delete-account endpoint for Apple 5.1.1 compliance;
 *       settings.html two-step RADERA confirmation modal, CSRF-protected delete flow.
 * v125: App Store-ready — terms.html, privacy.html Apple ID + APNs token sections,
 *       terms links in register/settings/landing footer.
 * v124: APNs key via APNS_KEY_CONTENT env var (no .p8 file on disk);
 *       native UX polish: cookie-banner.js hides on Platform.isNative().
 * v123: Cache-bust for landing news image fix — forces fresh fetch after SSR deploy.
 * v122: Landing news SSR — server pre-renders news cards (image + text) into HTML.
 * v120: PWA-install kill-switch (Platform.isNative), offline.html polish, child-login safe-area.
 * v119: Native push integration in push-manager.js — Platform.push on iOS/Android.
 * Strategy:
 *   - Static assets (CSS, JS, icons, fonts): Stale-while-revalidate (v25+)
 *   - API calls (/api/*): Network-only, bypass HTTP cache entirely
 *   - HTML pages: Network-first, fallback to cache
 *   - Offline: Serve /offline.html
 *   - Offline completions: handled by in-page offline-queue.js (not by SW)
 *   - Push notifications: Show system notification with title/body/icon from payload
 *   - PWA badge: setAppBadge(count) on push, clearAppBadge on notification click/app open
 *   - Notification click: Focus existing window or open new tab on correct URL
 *   - Update detection: postMessage('SW_UPDATED') to all clients when new SW activates
 *
 * v35 fix: Bundle A — 4 bugs (#1673775).
 *   - Bug #18+#F: submitCreateActivity wrapped in try/finally with btn-disable,
 *     failedSteps tracking mirrors library.js pattern, warning toast on substep failures.
 *   - Bug #15: login.html admin redirect now checks both isAdmin and is_admin (defense-in-depth).
 *   - Dead code: Removed unused localDay block in getDayOfWeek (daily-log-generator.js).
 *   - Bumped cache v34→v35 + HTML version tags to force fresh JS.
 *
 * v46 fix: BUG #1776812 — "The string did not match the expected pattern" when creating report.
 *   - Removed pattern="[0-9]*" from pinCode input in reports.html (oninput handler already strips non-digits).
 *   - Added type="button" to create report button to prevent implicit form submission.
 *   - Added formnovalidate to createBtn as belt-and-suspenders against HTML5 constraint validation.
 *   - Bumped cache v66→v67 to force fresh HTML for all users.
 *
 * v34 fix: 2 timezone bugs (#1672099).
 *   - Calendar: replaced UTC getUTCDay() with per-child timezone getLocalDateStr/getDayOfWeek.
 *   - Dashboard: replaced hardcoded Stockholm with per-child todayStr map (childTodayMap).
 *
 * v32 fix: 5 bugs (#1671752).
 *   - Bug 1+2+6: Removed z-250 !important CSS override on modals — survey popup (z-9000)
 *     was intercepting clicks and redirecting to /tyck/. Modals use z-[9100]/z-[9200].
 *     Also added missing ⭐ 4 star button + substep section to createActivityModal.
 *   - Bug 3: schedule.js getElementById('addActivitySubmitBtn') → 'addActivityBtn' (null → TypeError)
 *   - Bug 4: survey-popup.js CSRF token fix (window._csrfToken → Auth.getCsrfToken()),
 *     double-recording guard (_surveyPopupActionRecorded), and CSRF exempt path correction.
 *   - Bug 5: Delete activity now offers "Bara denna dag" vs "Alla kommande" via exclude-date endpoint.
 *   - Bumped cache v29→v32 + HTML version tags v2.9.0→v2.12.0 to force fresh JS.
 *
 * v29 fix: 6 broken interactions (#1662849).
 *   - Bug 6: schedule-templates INSERT missing day_of_week → NOT NULL violation (server-side fix)
 *   - Bug 3+5: survey popup X button now records 'dismissed' interaction → popup stops reappearing;
 *     server also suppresses popup after 'clicked' action (prevents survey redirect loop)
 *   - Bug 2: submitCreateActivity() in schedule.js now closes addActivityModal before recurrence
 *   - Bug 1+4: All dashboard modals raised from z-[250] to z-[9100], above survey popup z-9000
 *   - Bumped cache v28→v29 + HTML version tags v2.8.0→v2.9.0 to force fresh JS.
 *
 * v28 fix: BUG #1661846 — Logout redirect always goes to / instead of /login.
 *   - auth.js Auth.logout(): changed redirect from '/login' to '/'
 *   - Reads sessionRestored flag from server response: if true, goes to /dashboard
 *     (child logged out + parent session restored), otherwise always goes to /
 *   - Bumped cache v27→v28 + HTML version tags v2.7.0→v2.8.0 to force fresh JS.
 *
 * v27 fix: 5 broken button interactions from #1662377.
 *   - Added missing star value 4 button in Veckoschema (schedule.html)
 *   - Added inline substep/delsteg input to Bibliotek activity creation (library.html + library.js)
 *   - Bumped cache v26→v27 + HTML version tags v2.6.0→v2.7.0 to ensure users get fresh JS.
 *
 * v26 fix: Bugfixes for Översikt + Veckoschema button interactions.
 *   - Once-task search shows "Skapa ny" hint when zero results (dashboard.js)
 *   - Schedule item delete now shows confirmation dialog (schedule.js)
 *   - Fixed JSON.stringify breaking onclick attributes for "Skapa ny" button (schedule.js)
 *   - Bumped cache v25→v26 + HTML version tags v2.5.0→v2.6.0 to ensure users get fresh JS.
 *
 * v25 fix: JS caching changed from cache-first to stale-while-revalidate.
 *   Cache-first was causing users to be stuck on old JS files indefinitely —
 *   four consecutive bug fixes to activity creation never reached users because
 *   the SW always served the stale cached copy. Stale-while-revalidate returns
 *   the cached version immediately (fast) but also fetches the latest from the
 *   network and updates the cache, so the NEXT page load gets the fix.
 *   Cache name bumped v24→v25 to force full re-cache of all assets.
 *
 * v23 fix: PWA app badge (red number on home screen icon). Uses Badging API
 *   (Chrome 81+, Safari 16.4+) to show unread count on push and clear on
 *   notification click. Client-side badge clear on visibilitychange handled
 *   by sw-register.js.
 *
 * v22 fix: cookie-only auth migration. On activate, tells all clients to purge
 *   stale 'stjarndag_token' from localStorage (fixes login-loop where expired
 *   localStorage token overrode valid httpOnly cookie via Authorization header priority).
 *   Cache name bumped to force full re-cache of updated auth.js and other JS files.
 *
 * v21 fix: auth.js shared-device guard — silentRefresh detects parent/child token
 *   type mismatch from refresh cookie collision on shared devices.
 * v20 fix: Added dom-utils.js and feedback.js to STATIC_ASSETS pre-cache list.
 * v19 fix: SKIP_WAITING message handler for "Ladda om nu" banner.
 * v18 fix: API cache:'no-store' to bypass 304 reconstitution bugs.
 */

/* Wave 2: Offline reading — schema + belöningar vises offline i barnvy */
const CACHE_NAME = 'stjarndag-v338';
// stjarndag-v338: bump magic JS cache + platform-html version rewrite on serve
// stjarndag-v337: parent-top-chrome flex row for toggle+icons; cache bust CSS v10
// stjarndag-v336: iPad — centered compact view toggle pill, tablet top row
// stjarndag-v335: view toggle + header icons share one top row; magic toggle transparent bar
// stjarndag-v334: single fixed notis+avatar header on magic dashboard; P contrast fix
// stjarndag-v330: ACT-1 PR5.2 activation experiment variant table in admin
// stjarndag-v325: ACT-1 PR4 — AI starter plan personalize + custom_items schedule save
// stjarndag-v324: ACT-1 Deploy 1+3 — activation state, handoff, starter-plan wizard, dynamic sitemap, referral v0
// stjarndag-v323: NPF-sida copy — validerat smärtspråk ("mindre tjat, färre konflikter, lugnare vardag") i /rutiner-npf-barn (h1, lead, meta, CTA) för bättre konvertering + SEO
// stjarndag-v322: SEO — /bildschema-app + /alternativ-bildschema-tavla cornerstone-sidor; "Guider"-kolumn i startsidans footer (interna länkar till alla 5 artiklar)
// stjarndag-v321: analytics-shim.js (global window.analytics) injiceras via platform-html — fixar döda nav_hub_click/readiness_action_click/child_profile_section
// stjarndag-v320: Google Ads-tagg AW-7601142474 i marketing-events.js (GA4-importerad konvertering); ?v=2.13.3 på index/register/login
// stjarndag-v319: Win-back auto-godkännande (feature_flag win_back_auto_approve, default på) + admin-toggle i Email-logg
// stjarndag-v318: Tillväxt — SEO-artiklar (morgonrutin/belöningssystem/NPF), analytics-whitelist CTA-events, veckomejl delningsblock
// stjarndag-v317: Barnvy header — 3 distinkta kontroller (🔄 Byt barn / ⚙️ Förälder / 🚪 Logga ut)
// stjarndag-v315: Fas 11 — remove Tier A dead client code (B4 inventory)
// stjarndag-v314: Fas 10 — onboarding XSS escape + lint:public
// stjarndag-v313: Bugfix — barnvy logout/switch-child (parental-gate PIN overlay)
// stjarndag-v312: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v316: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v323: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// v311: Fas 8 finish — dashboard-dnd/activity-modal + schedule F3a-F3c + child-dashboard-rewards
// v310: F2d dashboard-views.js — timeline + side-by-side views extracted from dashboard.js
// v309: F2f dashboard-approvals.js — give-stars modal + request panel extracted from dashboard.js
// v308: F2i dashboard-card-actions.js — pause/give-stars/quick actions extracted from dashboard.js
// v307: F2h dashboard-copy-modals.js — copy-day/copy-child/delete/confirm modals extracted from dashboard.js
// v302: cache-only refresh (no code change) — force a clean, consistent asset cache
//       on all devices after the v298↔v300↔v301 deploy churn left some PWAs skewed.
// v298: F2c dashboard-star-history.js — weekly stars chart extracted from dashboard.js
// v297: F2b dashboard-cta.js — co-parent invite + dela-appen CTA banners extracted from dashboard.js
// v296: F3 child-dashboard-celebrations.js — milestone/confetti/dopamin burst extracted from child-dashboard.js
// v295: F2 dashboard-special-days.js — special-day calendar/modal extracted from dashboard.js
// v294: F1 schedule-core.js — shared DAYS/SECTIONS/rendering between dashboard + schedule
// v293: shared co-parent invite modal (body portal) + settings soft-nav boot
// v292: co-parent invite in settings + hub; opaque invite modal in magic view
// v291: magic appearance — assign-schedule contrast, fixed nav header, family modal z-index
// v290: magic hub pages re-render after soft nav (planning/rewards/dashboard) + contrast fixes
// v289: soft nav for native tab bar, no menu blink on tab switch
// v284: Applandningssidan v2 — welcome/role/adult entry flow, app-entry.js state machine, child "Jag hittar inte mig själv"
// v283: avatar upload compress + reports mobile nav header fix (combined deploy)
// v282: reports mobile — stop injecting sidebar nav into page header
// v281: avatar upload — resize/compress before upload, webPath fallback, better errors
// v280: barnprofil mobile — photo pick PROMPT, grid tabs, overflow clip, iPad safe-area header
// v279: family UI fixes — familjekista, collapsed name, native photo permissions
// v278: soft-nav boot fixes — schedule logoutBtn guard, dashboard hub re-init, skatt contrast
// v277: magic soft navigation — no full page reload between bottom nav items
// v276: iPad magic flash (inline early CSS), För dig contrast, preview back from Extra
// v275: fix classic→magic flash on parent page navigation
// v271: tablet magic view — bottom nav + help/feedback layout, upgrade package grid
// v270: Apple Sign In — visible errors on role-selection, client-log diagnostics, backend [APPLE] logs (build 20)
// v267: retroactive star entry discoverability — daily-log date deep-link, home hub backfill CTA, FAQ
// v265: bottom nav Extra tab (Hem·Schema·För dig·Skatt·Extra·Mer) + nav remount fix
// v263: app-config — Services ID only for web Apple; redirect URI falls back to request origin
// v252: Remove all subscription/payment UI text for App Review (Build 15)
// v251: Build 14 — remove IAP/RevenueCat from client (free app for App Review)
// v250: Model A founder program — pricing-info, admin founder limit, Grundarmedlem banner
// v249: email-logg load on hash nav + timeout + window exports
// v224: iPad/iOS onboarding — emoji picker visible alongside optional photo (App Review 2.1a fix)
// v157: Remove isInstalledApp() redirect from child-login.js + child-dashboard.js
//   — /child-login must work in all contexts (browser + app), not just installed apps.
// v155: Föräldralås (Parental PIN) — fix child→parent PIN guard security hole.
// v154: Instant DOM-uppdatering after mutations — no page reloads.
// v153: Föräldralås (parent PIN) — PIN gate on child-login "Jag är vuxen",
//   child-logout PIN overlay, login.html child session guard, SW cache bump.
// v127: DB-migration för IAP-beredskap — is_lifetime_free, rc_customer_id, subscription_status DEFAULT 'none'
// v126: App Store-förberedelse — /terms route, privacy.html Apple ID + APNs sections
// v125: App Store-ready — terms.html, privacy.html Apple ID + APNs token sections
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/offline.html',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json',
  '/css/theme.css',
  '/css/tailwind.build.css',
  '/js/platform.js',
  '/js/auth.js',
  '/js/dom-utils.js',
  '/js/theme.js',
  '/js/i18n.js',
  '/js/offline-queue.js',
  '/js/offline-store.js',   // IndexedDB wrapper for offline schema/profil/belöningar
  '/js/sw-register.js',
  '/js/mobile-nav.js',
  '/js/feedback.js',
  // Child view pages + JS (offline reading)
  '/child-login.html',
  '/child-dashboard.html',
  '/css/child-login-magic.css',
  '/js/child-login.js',
  '/js/child-dashboard.js',
  '/js/child-dashboard-celebrations.js',
  '/js/child-dashboard-rewards.js',
  // Pedagog pages
  '/pedagog-note.html',
  '/pedagog-oversikt.html',
  '/js/skeleton.js',
  '/js/sse-client.js',
  '/js/child-dashboard-sse.js',
  '/js/help-bubble.js',
  '/js/feature-check.js',
  '/js/platform.js',
  '/js/device-mode.js',
  '/js/package-access-cache.js',
  '/js/session-gate.js',
  '/js/parental-gate.js',
  '/js/crash-reporter.js',
  '/js/native-tab-bar.js',
  '/js/deep-link-router.js',
  '/js/google-auth-ui.js',
  '/css/login-magic.css',
  '/css/app-entry.css',
  '/js/login-magic.js',
  '/js/app-entry-analytics.js',
  '/js/app-entry.js',
  '/js/dashboard-polish.js',
  '/css/platform-gating.css',
  '/css/dashboard-polish.css',
  // Professional report
  '/professional-report.html',
];

// ─── Message handler: allow clients to trigger skipWaiting ──
// Why: when a new SW is in the "waiting" state (e.g. install succeeded but
// skipWaiting didn't fire, or a tab was open preventing activation), the
// client-side "Ladda om nu" button sends this message to force activation.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Install: pre-cache static assets ────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: clean up old caches + purge stale localStorage auth ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
      .then(() => {
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            // Tell clients to purge stale localStorage token (cookie-only auth migration)
            client.postMessage({ type: 'CLEANUP_AUTH' });
            // Notify that a new version is active so they can show a reload banner
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});

// ─── Fetch strategy ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN fonts, Tailwind, etc.)
  if (url.origin !== self.location.origin) return;

  // API calls: Network-only, bypass HTTP cache entirely.
  // Why cache:'no-store': prevents the browser from sending If-None-Match headers
  // that produce 304 responses. 304 bodies sometimes fail to reconstitute through
  // the SW fetch pipeline, leaving pages stuck on "Laddar…" (v17 regression).
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() =>
        new Response(
          JSON.stringify({ error: 'Offline', message: 'Du är offline. Anslut till internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Static assets (CSS, JS, images, fonts): Stale-while-revalidate
  // Returns cached version immediately (fast), then fetches latest from network
  // and updates cache so the NEXT load gets the fresh version. This ensures
  // bug fixes propagate within one page load cycle instead of being stuck forever.
  if (
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          const networkFetch = fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached); // If network fails, fall back to cache
          // Return cached immediately if available, else wait for network
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // HTML pages: Network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match(OFFLINE_URL);
      })
  );
});

// ─── Push: show system notification + set PWA badge ─────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Min Stjärndag', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Min Stjärndag';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/dashboard' },
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      // Update PWA home screen badge with count of visible notifications.
      // Badging API: Chrome 81+, Safari 16.4+ — no-op where unsupported.
      if ('setAppBadge' in navigator) {
        return self.registration.getNotifications().then((notifications) => {
          return navigator.setAppBadge(notifications.length);
        });
      }
    })
  );
});

// ─── Notification click: open correct URL + update badge ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/dashboard';

  const absoluteUrl = targetUrl.startsWith('http')
    ? targetUrl
    : self.location.origin + targetUrl;

  event.waitUntil(
    // Update badge: remaining notification count after closing this one.
    self.registration.getNotifications().then((remaining) => {
      if ('setAppBadge' in navigator) {
        if (remaining.length > 0) {
          navigator.setAppBadge(remaining.length);
        } else {
          navigator.clearAppBadge();
        }
      }
    }).then(() => {
      return clients.matchAll({ type: 'window', includeUncontrolled: true });
    }).then((windowClients) => {
      // Focus existing window on the target URL if one is open
      for (const client of windowClients) {
        if (client.url === absoluteUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // No matching window — open new tab
      if (clients.openWindow) {
        return clients.openWindow(absoluteUrl);
      }
    })
  );
});
