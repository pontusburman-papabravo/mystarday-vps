/**
 * Min Stjärndag — Service Worker v392 // pragma: allowlist secret
 * v856: Skolstart 2026 — homepage module, meta copy, guider-länk
 * v819: Fas 2B app-entry-orchestrator + session-gate entry wiring
 * v772: aktivitetstimer i dagsvy (Morgon/Dag/Kväll) — Starta timer synlig
 * v771: aktivitetstimer v2 polish — timglas, overlay animation
 * v770: login entry logo uses app.name i18n (My Starday in English)
 * v769: child-login PIN keypad — higher contrast digits on white keys (physical QA)
 * v764: Child session resume on /child-login + clear subStepExpanded on loadDay
 * v763: Child core-journey stability — substep toggle in-flight guard, resilient precache, /health cache_version
 * v665: App Store 1.3 — barnprofil födelsedag + iPad touch targets (Guideline 4 / 2.1a)
 * v659: Barnprofil Inställningar — byt namn & emoji (saknades efter drawer→profil)
 * v654: Store-badge ä → H&#228;mta (encoding) + ren inline SVG-tag
 * v393: App Store-badge inline SVG (fix trasig bild)
 * v392: Fix App Store-lansering — hero-kort istället för trasig banner
 * v390: App Store launch banner på startsidan
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
/* v415: PWA precache barnmeny v2 — child-worlds.js, child-worlds-nav.js, child-layer-router.js */
// stjarndag-v669: en-GB Planning, Library, Family, Schedule P0/P1 (P-i18n-Planning-Family-C)
// stjarndag-v668: fix native-tab-bar stale nav labels on locale-init (P-i18n-Home-Today-C)
// stjarndag-v667: en-GB Today shell + Home nav/offline locale (P-i18n-Home-Today-C)
// stjarndag-v664: en-GB Home magic hub locale gate (P-i18n-Home-B)
// stjarndag-v710: admin inbox — reply to contact messages from Meddelanden
// stjarndag-v716: remaining English child experience (settings, schedule chrome, today warmth)
// stjarndag-v718: daily-log Android child picker — robust boot, 401 retry, pointerup tabs
// stjarndag-v727: merge #775 RC-1 i18n (locale switch, system-origin guards, calendar)
// stjarndag-v738: fix register form gate — hide fields until language + country confirmed
// stjarndag-v739: fix(register) fail-open form — remove pointer-events gate, inline unlock
// stjarndag-v740: fix(onboarding) stop top-level ot() from clobbering window.ot (slim signup)
// stjarndag-v765: clear offline queue on logout (child handoff / full clear)
// stjarndag-v764: child-login resume active child session; loadDay clears subStepExpanded
// stjarndag-v763: child substep stability, resilient SW precache, /health cache_version
// stjarndag-v766: growth feedback loop client assets (flag-gated)
// stjarndag-v772: aktivitetstimer i dagsvy-kort
// stjarndag-v773: aktivitetstimer på delsteg
// stjarndag-v774: levererad SVG-timglas (UL activity-hourglass-v1)
// stjarndag-v780: timer wake lock, ingen ikonblink, delsteg-only timer
// stjarndag-v781: settings — bind logout before async settings load
// stjarndag-v784: R0-06 settings support diagnostics clipboard
// stjarndag-v786: settings parent i18n bootstrap (en-GB smoke)
// stjarndag-v787: settings switch user → child picker handoff
// stjarndag-v788: settings parent i18n ready signal + founder smoke pageText hardening
// stjarndag-v791: library activity timer master bridge (setup clarity)
// stjarndag-v792: Child Today en-GB visible copy + i18n ready signal
// stjarndag-v793: Extra stöd — övergångsstöd gate via subscription access (parent + child)
// stjarndag-v795: parent global feedback FAB en-GB via home.globalFeedback
// stjarndag-v797: Extra stöd — child subscription/access allowlist + package access fallback
// stjarndag-v798: Home day-off modal en-GB + 44px touch + browser gate (RC-1 R1)
// stjarndag-v799: Library image archive upload i18n (RC-1 R2)
// stjarndag-v807: R4.7 product-led growth (invite, weekly highlight, referral)
// stjarndag-v814: engångsaktivitet — flytta ordning idag (NU/NÄSTA-dag)
// stjarndag-v815: widget återanslut — force sync, mount retries, auth hook defer
// stjarndag-v816: widget tap reauth → inställningar; förälder på /child/today redirect
// stjarndag-v817: widget reconnect — binding intent id, stale configure guard
// stjarndag-v835: profile picker adult unlock without JWT status gate
// stjarndag-v845: settings magic hub — fix settings-account pt shadowing + navigation preserve
// stjarndag-v855: aktivitetstimer v2 — substep session restore + 2.5s bell finish
// stjarndag-v857: landing product spotlight section + showcase image
const CACHE_NAME = 'stjarndag-v857';
// stjarndag-v744: fix admin-start.js SyntaxError (restore formatPct)
// stjarndag-v660: i18n foundation — locale bundles, auth-entry-i18n, locale-switcher
// stjarndag-v659: calendar day-card text + magic dark tab bar on all parent pages
// stjarndag-v645: library Belöningar chrome icon + hash-active bottom nav
// stjarndag-v644: fix bottom nav leaving /library — hard nav + no stale HTML shell
// stjarndag-v643: chrome notiser dark strokes on white header tile (fix vit-på-vit)
// stjarndag-v642: icon-system v4 only — hub/chrome/child assets, no v3 fallback
// stjarndag-v641: v4 chrome notiser bell (warm gray + gold, not white v3)
// stjarndag-v640: Quick Actions v4 — Hem snabbvalskort (Nordic Calm)
// stjarndag-v639: revert Design Kit legacy inference — keep v4 nav only
// stjarndag-v637: fix(family) ROLES TDZ on warm-cache fast path
// stjarndag-v636: fix(family) warm-cache render before familyData assigned
// stjarndag-v635: Nordic Calm UI Icons v4 — nav active/inactive (bottom nav)
// stjarndag-v632: share message includes register URL inline (native share text-only)
// stjarndag-v631: share links — clean /register URL, no ?ref= codes; fix duplicate native share URL
// stjarndag-v630: High Contrast Icon System v3 — near-white symbols, no CSS glow
// stjarndag-v629: Premium Icon System v2 — stronger glow icons, no white tiles
// stjarndag-v628: light icon tiles on dark magic — purple icons readable on purple bg
// stjarndag-v627: native startup redirect, family fast-path, Hem quick-action icons
// stjarndag-v626: landing mobile — no parent tab bar on /, scrollable menu, Tipsa in header
// stjarndag-v625: share popup contrast + header icon tiles; landing Tipsa restored with icon system
// stjarndag-v624: Stjärndag Icon System v1 — global SVG icons (nav, header, hubs, child fallback)
// stjarndag-v623: parent header icons — Notiser (klocka), Inställningar (kugghjul), Tipsa (glödlampa)
// stjarndag-v622: parent header — dela (tydlig ikon) + notiser + inställningar (kugghjul); delningsmejl med mottagare
// stjarndag-v621: handoff film in new-family + add-child onboarding
// stjarndag-v620: remove handoff film preview banner
// stjarndag-v619: admin overview — unique child self-checkoffs metrics
// stjarndag-v618: handoff film replay timer cleanup
// stjarndag-v617: barnets_samling live for all families
// stjarndag-v616: NNL mode — show Nästa/Senare upcoming activities in focus view
// stjarndag-v615: revert handoff film v1.5 — restore pre-emotional-bridge film
// stjarndag-v614: revert Idag quest layout; photo card star reward in foot row
// stjarndag-v613: Idag samling quest — NU/Nästa stack, time-aware, no empty dagdel
// stjarndag-v611: allow child JWT to fetch /api/avatars for Mina personer profile photos
// stjarndag-v610: handoff film demo MP4 + ACT-1 integration deploy
// stjarndag-v609: handoff film demo MP4 + ACT-1 integration
// stjarndag-v608: Mina personer — warm role emojis, larger person cards, richer detail sheet
// stjarndag-v607: merge — Mina personer tap sheet + Familj inställningar back nav
// stjarndag-v606: Familj → Inställningar back nav fix (hash #profil loop)
// stjarndag-v604: Mitt tab isolation, header cleanup, activity cards, family avatars
// stjarndag-v603: handoff film — brand styling + melodic ambient music
// stjarndag-v602: Barnets samling — hide duplicate header Byt barn/Logga ut/Förälder (Mitt owns actions)
// stjarndag-v601: merge — Mitt-flik + SPA layer fix + family avatar + handoff film preview
// stjarndag-v600: Barn SPA-flikbyte; handoff film preview deploy fix
// stjarndag-v599: Mitt-flik; onboarding handoff film preview /onboarding/film-preview
// stjarndag-v598: Child Mina personer avatar_src; onboarding handoff film music
// stjarndag-v597: Familj — loading skeleton, prefetch, Inställningar-länk
// stjarndag-v596: Avatar crop — square viewport + EXIF orientation (fix distortion)
// stjarndag-v595: Family Avatar — show Profilbild in Inställningar → Profil & konto (magic group tag)
// stjarndag-v594: Family Avatar merge gates — no-cache proxy, lifecycle cleanup, crop a11y
// stjarndag-v593: Family Avatar v1 — client migration to avatar_src, onboarding deferred upload
// stjarndag-v592: Family Avatar v1 — private storage, member-avatar, crop upload flow
// stjarndag-v590: Idag fun polish — star trail, greetings, current dagdel highlight
// stjarndag-v589: Infer pictogram pack keys from activity name/emoji when icon_key missing
// stjarndag-v588: Activity card size — standard/large presentation (gate ON)
// stjarndag-v587: Barnets samling pictogram packs — simple/action (runtime SW cache, ~3.5 MB, not precached)
// stjarndag-v585: Theme picker — atomic visual_theme save + focus trap polish
// stjarndag-v584: Barnets temaväljare — child-theme-picker.js/css (gate ON, Min samling)
// stjarndag-v583: Barnets samling themed tab icons — runtime SW cache (not precached, ~5.1 MB total)
// stjarndag-v582: Barnets samling theme backgrounds — runtime SW cache (not precached, ~1.6 MB total)
// stjarndag-v581: Barnets samling themes — 10 canonical themes, adventure fallback + aliases
// stjarndag-v580: Child boot guard — hide legacy chrome until barnets_samling resolves
// stjarndag-v579: Defer schedule load off Idag — faster Min samling / Skattkammaren entry
// stjarndag-v578: Skattkammaren redesign — unified CSS hero, vision order, no PNG clutter
// stjarndag-v577: Skattkammaren visual fix — crown crop, CSS scene bg, cleaner progress
// stjarndag-v576: Google login button — branded logo + label-safe loading state
// stjarndag-v575: Android — re-enable flat magic view (shell + home hub, no 3D GPU)
// stjarndag-v573: Skattkammaren Barn art assets — scene, plaque, pending, history
// stjarndag-v572: Android — fix androidStabilityLog recursion (dashboard shadowed window fn)
// stjarndag-v571: Android — remove GPU CSS MutationObserver (stack overflow fix)
// stjarndag-v569: Android dashboard — data fetch parallel with chrome (först visa data)
// stjarndag-v568: Android classic dashboard — restore essential scripts + top chrome
// stjarndag-v567: Android safe mode — keep schedule-core (dashboard.js parse dependency)
// stjarndag-v566: Android auth guard lightweight fetch + ultra-minimal dashboard scripts
// stjarndag-v565: ANDROID_PLAY_REVIEW_SAFE_MODE — broader WebView detect + hardening beacon
// stjarndag-v564: Android classic dashboard — skip parent-magic injection + strip magic scripts
// stjarndag-v563: server-side strip GPU CSS + heavy scripts on Android WebView
// stjarndag-v561: Skattkammaren component polish — scene, plaque, progress stars, pending card
// stjarndag-v560: gate native-debug injection behind NATIVE_DEBUG_OVERLAY
// stjarndag-v549: Android login contrast fix + disable magic 3D orbs post-login
// stjarndag-v547: Android Play stability — early is-native-android + filter:blur GPU guard
// stjarndag-v546: Fas D #586 — minneskort, hylla, diplom i Min samling
// stjarndag-v543: Fas B #618 — streak-kedja från stats.streak
// stjarndag-v542: Fas B #617 — trofévägg från achievements
// stjarndag-v541: Fas B #616 — stjärnglas + medaljtrappa (lifetime_stars)
// stjarndag-v540: Fas B #615 — Min samling shell (child-samling-present)
// stjarndag-v539: admin activation metrics — schema_saved_at only + handoff diagnostics
// stjarndag-v538: onboarding activity guide — parent picks completion style defaults
// stjarndag-v537: Barnets samling #593 — göm/avlänka gammal värld bakom gate ON
// stjarndag-v536: PR3 handoff reminder resume — /onboarding?resume=child-handoff
// stjarndag-v535: Barnets samling — #591 route + första gated Fas C-slice belöningsvy
// stjarndag-v532: weekly summary email — settings#aviseringar anchor + opt-out footer
// stjarndag-v531: Barnets samling Fas A — fyra flikar bakom barnets_samling gate (#588)
// stjarndag-v529: child access semantics — handoff click no longer sets child_access_completed_at
// stjarndag-v528: ambient hardening — generated pack, director budgets, generic tokens
// stjarndag-v527: ambient object runtime — tappable Morgonhus + Trädgården play world
// stjarndag-v526: sommarhälsning — riktigt varumärkesnamn i HTML (ej [REDACTED])
// stjarndag-v525: server-side brand placeholder fix on landing page
// stjarndag-v510: Morgonhus immersive full-bleed hotspots (Min värld 10/10 pass)
// stjarndag-v509: museum-scene-master-high.png + museum scene-bg export
// stjarndag-v508: full catalog wire-in (home exterior, outdoor rooms, trophy/reading)
// stjarndag-v507: catalog room wire-in (hall+102–105), scenes.json, memory-hall master, hero assets
// stjarndag-v506: generic room scene export (home→lake webp sets)
// stjarndag-v502: platform auth matrix + Google signup/link (google_user_id)
// stjarndag-v501: Minnesrummet scene v2 diorama illustration (BL-041)
// stjarndag-v490: R3 100 sidor + ACT-1 AI-only + custody a11y + För dig polish (merge main)
// stjarndag-v489: R3 finish — helgschema/läxschema PDF-landningssidor
// stjarndag-v484: merge PR 3 — övergångsstöd (teacch-gated) + känslostöd (basic) + föräldrarapport (EPIC 3.1-3.8, D9: EPIC 3.3 exkluderad)
// stjarndag-v483: merge FEAT-1B/1C custody (v482) with bildstöd PR2+R2 (v482) — NU/Nästa/Senare default, child-week-overview.js, 17 nya resurser-sidor
// stjarndag-v482: FEAT-1B verify + FEAT-1C custody_override
// stjarndag-v481: Journey Fas 2 + ACT-1 PR5 nudge ON (ship train)
// stjarndag-v478: Mina personer 10/10 dev-gate (mina_personer_10_10) + legacy fallback (merge main)
// stjarndag-v477: Hem snabbknappar — fix klick (länk) + etikettlayout
// stjarndag-v475: Bildstöd PR R2 — resurser-kategoriutökning (känslor/övergångar/TEACCH/skola/hygien) PDF-footer fix
// stjarndag-v474: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v473: Slim signup + Journey + power-user paths + enable migration (merge bildstöd v472)
// stjarndag-v463: SEO marketing images — logical routine sequences only
// stjarndag-v462: SEO guides — marketing-seo images for Google Image Search
// stjarndag-v458: SEO hub /bildschema-app cornerstone + seo-article.css + article-events.js
// stjarndag-v454: morgonhus scene@2x.webp precache + manifest godkänd
// stjarndag-v453: barnmeny v2 — visa bottom nav när child-worlds-v2 är aktiv
// stjarndag-v452: barnillustrationer — lazy bg + family hall glass + morgonhus scene CSS
// stjarndag-v451: barnillustrationer under /images/child/ — bakgrunder, hubbar, rum, dekaler
// stjarndag-v441: För dig + barnprofil kontrast i mörkt magic-tema
// stjarndag-v440: library init resilience + Planering→Bibliotek empty-box fix
// stjarndag-v439: fix library init crash (_libIsAdmin) + Bildarkiv section scope
// stjarndag-v438: merge parent hubs 10/10 (Hem/Planering/Belöningar/Familj) + first-star chrome
// stjarndag-v437: Familj hub 10/10 — barnkort → barnprofil, ingen magic-stat-hero
// stjarndag-v436: Belöningar hub 10/10 — inline stjärnor, ingen skattkammaren-CTA
// stjarndag-v435: merge Hem 10/10 + Planering fold-fix
// stjarndag-v402: Family Journey Fas 1 — journey-context API + celebration modal
// stjarndag-v400: Bibliotek — parallel data load, classic hash routing, tab retry on Laddar…
// stjarndag-v399: Fix Stjärnor & kista → /skattkammaren; library load error states; parent treasury route
// stjarndag-v398: Daily log — light text on dark magic activity cards (contrast fix)
// stjarndag-v397: Engine coach change notice — prod user contract in #engineCoachMount
// stjarndag-v394: Admin familjer/meddelanden load fix; FAB positioning; magic contrast on white cards
// stjarndag-v393: App Store-badge inline SVG (fix trasig bild)
// stjarndag-v386: Beskär-modal — z-index över tab bar, sticky Spara-knapp
// stjarndag-v385: Bibliotek — beskär/zooma egna aktivitetsbilder med barnvy-förhandsgranskning
// stjarndag-v384: fix familjehallen — ogiltig parents SQL (DISTINCT + ORDER BY)
// stjarndag-v380: Barnvy variant C — bildschema-kort för aktiviteter med eget foto
// stjarndag-v379: print-schema — iframe-fallback på mobil/PWA (popup blockeras)
// stjarndag-v378: Bibliotek — kopiera schema med start/slutdatum (LOV m.m.)
// stjarndag-v376: Tilldela schema — start/slutdatum för period (t.ex. lov)
// stjarndag-v374: print-schema — hela dagen i förhandsgranskning + dynamisk utskriftsskalning
// stjarndag-v373: dedikerad /print-schema — barn + period (1v/2v/1m), ett A4-ark
// stjarndag-v372: Hem — dagssammanfattning i hub + läsbar medförälder-CTA i ljust tema
// stjarndag-v367: Tilldela schema — bekräftelseruta .hidden blockerade inte overlay (klick döda)
// stjarndag-v365: ACT-1 PR3 — starter-plan save → handoff steg 5, checkpoint scripts
// stjarndag-v364: ACT-1 PR2 — first star på step6Btn, PIN→child_access, handoff soft gate copy
// stjarndag-v363: Tilldela schema — bekräftelsedialog z-index + stäng på bakgrund/Escape
// stjarndag-v362: Ljus tema — Familjemuseum, bibliotek, familjekort, inställningar utseende
// stjarndag-v361: Mobil tema-toggle — delegation, dölj legacy toggle, fix settings-grupp :not(.hidden)
// stjarndag-v360: Bibliotek/planering — modal-CSS, standardbibliotek load, tillbaka från planering, schema-hero
// stjarndag-v359: Bibliotek — schema load-fix, nav z-index, modal stängs vid navigering, bilduppladdning HEIC
// stjarndag-v358: Ljus-tema — vit bakgrund, mörka glass-overrides av i light mode, mjukare 3D-orbs
// stjarndag-v357: Planering — full load schema/bibliotek/kalender; kalender apiFetch-fix; tilldela schema dialog
// stjarndag-v356: Tema-toggle fixar Hem (ljus bakgrund för home-hub) + soft-nav återställer tema (MAGIC_VERSION 16)
// stjarndag-v355: Bildarkiv delete — aktiviteter faller tillbaka till emoji
// stjarndag-v354: Planering↔Bibliotek tillbaka-nav + full load från library shell
// stjarndag-v353: Tema-toggle fixar Hem (ljus bakgrund för home-hub) + Hem (dashboard) full-load istället för soft-nav (fix "bara notiserna")
// stjarndag-v352: Aktivitetsmodal — bildval först, scrollbar modal, mobil redigera
// stjarndag-v351: Planering hub — Bibliotek + Bildarkiv överst (bygg innehåll)
// stjarndag-v350: Bibliotek magic hub — window.switchTab + Bildarkiv-menyval
// stjarndag-v349: HOTFIX family.js — childAvatarHtml must not shadow window.renderChildAvatar (stack overflow)
// stjarndag-v347: Bildarkiv i biblioteket — egna foton på aktiviteter (family_image + image_url)
// stjarndag-v346: HOTFIX /api/auth/me 500 logout — ui_view_mode read defensively; authGuard keeps session on 5xx/network
// stjarndag-v344: parent view mode synced server-side (menu/design follows account across devices); magic assets v13
// stjarndag-v343: För dig hard-load init fallback (page boots without magic chain / on SW static HTML)
// stjarndag-v342: FEAT-1C schedule custody UI (vecka A/B, dagsfärger, mina dagar)
// stjarndag-v341: soft-nav flash fix + top-chrome icons when toggle loading
// stjarndag-v340: FEAT-1B — custody handoff, parent push filter, print my days, child log A/B
// stjarndag-v339: bump magic JS cache + platform-html version rewrite on serve
// stjarndag-v338: FEAT-1A boendeschema — custody API, family settings, dashboard banner
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
// stjarndag-v390: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v403: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v404: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v409: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v412: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v417: Morgonhuset toast visibility + force remount after Skattkammaren
// stjarndag-v416: Morgonhuset — Skattkammaren round-trip + tap feedback toast
// stjarndag-v415: PWA precache barnmeny v2 nav scripts (fix legacy child nav on stale cache)
// stjarndag-v414: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v418: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v419: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v420: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v421: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v422: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v423: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v424: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v447: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v448: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v449: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v450: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v459: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// v461: Fas 8 PR-S3/S4 — schedule-activity-modals.js + schedule-dnd.js extracted from schedule.js
// stjarndag-v461: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v464: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v465: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v466: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v468: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v472: Slim signup power-user paths (välj schema / full wizard) + prod flag enable
// stjarndag-v471: Slim signup (3 frågor → Hem) + event-first signup Journey (sj_* coach)
// stjarndag-v470: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v471: Fas 8 F3e–g — child-dashboard-checkoff/substeps/load-day.js; host ~550 r
// stjarndag-v472: Bildstöd PR1 — pictogram-registry.js, icon_key stjärnrutnät (Skattkammaren)
// stjarndag-v474: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v475: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v476: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v518: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v622: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v633: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v634: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v635: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v652: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v653: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v654: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v659: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v667: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v671: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v672: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v675: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v676: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v677: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v678: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v679: i18n bootstrap on rewards/for-dig hubs + family locale goals API
// stjarndag-v680: dashboard tour i18n + daily-log child selection boot fix
// stjarndag-v681: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v682: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v683: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v684: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v685: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v686: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v688: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v689: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v690: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v691: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v692: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v693: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v694: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v695: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v696: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v698: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v700: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v701: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v702: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v703: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v704: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v705: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v706: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v707: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v708: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v709: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v710: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v711: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v718: daily-log Android child picker boot + retry (support #43)
// stjarndag-v717: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v734: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v737: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v742: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v745: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v746: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v747: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v748: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v749: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v750: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v753: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v754: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v755: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v756: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v757: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v758: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v763: child core-journey stability — substep offline queue, resilient precache
// stjarndag-v762: admin inbox split + merge main

// stjarndag-v763: growth feedback loop client assets (flag-gated)
// stjarndag-v767: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v768: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v770: native child-first session restore (session-cookie-reconcile + bootstrap)
// stjarndag-v769: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v770: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v781: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v782: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v783: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v797: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v808: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v809: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v810: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v811: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v812: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v815: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v814: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v813: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v818: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v819: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v820: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v824: Fas 4A trusted daily child UX
// stjarndag-v823: Fas 3B adult privilege lease + PIN fallback + lifecycle
// stjarndag-v838: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v839: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v840: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v844: settings magic-settings-ready fail-safe — legacy visible until hub renders
// stjarndag-v846: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v847: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
// stjarndag-v854: Activity Timer V2 — calm single finish chime, substep Klar via toggleSubStep
// stjarndag-v853: Family Device acceptance — deterministic Family boot + shared adult PIN gate
// stjarndag-v852: Family Device P1 delta — in-flight-only family fetch, no warm-prefetch swallow
// stjarndag-v851: Family Device P1 — false-logout fix + shared /api/family coalescing
// stjarndag-v850: lifecycle Capacitor addListener compat + select-parent error stages
// stjarndag-v856: Fas 9 — Tailwind build pipeline (CDN → tailwind.build.css)
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
  '/child-profile-picker.html',
  '/child-dashboard.html',
  '/css/child-login-magic.css',
  '/js/child-login.js',
  '/js/child-profile-picker.js',
  '/js/app-entry-orchestrator.js',
  '/js/profile-switch-chrome.js',
  '/css/profile-switch-chrome.css',
  '/js/family-device-entry-bootstrap.js',
  '/js/native-child-session-restore.js',
  '/js/trusted-device-client.js',
  '/js/trusted-device-bootstrap.js',
  '/js/child-session-context.js',
  '/js/child-app-i18n.js',
  '/js/child-today-i18n-bootstrap.js',
  '/js/child-ui-text.js',
  '/js/child-dashboard.js',
  '/js/child-first-star-mode.js',
  '/css/child-first-star-mode.css',
  '/js/child-dashboard-photo-cards.js',
  '/js/child-dashboard-substeps.js',
  '/js/child-dashboard-activities.js',
  '/js/child-dashboard-offline.js',
  '/js/child-dashboard-day-nav.js',
  '/js/child-dashboard-timers.js',
  '/js/activity-timer-session.js',
  '/js/activity-hourglass.js',
  '/images/child/activity-timer/hourglass.svg',
  '/js/child-dashboard-activity-timer.js',
  '/js/child-dashboard-load-day.js',
  '/js/child-dashboard-checkoff.js',
  '/js/child-dashboard-celebrations.js',
  '/js/child-week-overview.js',
  '/js/platform-feedback-child.js',
  '/js/child-dashboard-rewards.js',
  '/js/child-worlds.js',
  '/js/child-theme.js',
  '/js/child-theme-picker.js',
  '/js/child-achievement-i18n.js',
  '/js/child-pictogram-packs.js',
  '/js/child-pictogram-picker.js',
  '/js/child-activity-card-size.js',
  '/js/child-activity-card-size-picker.js',
  '/js/child-worlds-nav.js',
  '/js/child-layer-router.js',
  '/js/child-samling-present.js',
  '/js/child-samling-view.js',
  '/css/child-samling.css',
  '/css/child-themes.css',
  '/css/child-theme-picker.css',
  '/css/child-pictogram-picker.css',
  '/css/child-activity-card-size.css',
  '/js/child-world-bg-lazy.js',
  '/js/child-world-wayfinder.js',
  '/css/child-world-wayfinder.css',
  '/js/ambient-objects-pack.js',
  '/js/ambient-director.js',
  '/js/ambient-object-runtime.js',
  '/css/ambient-object.css',
  '/js/child-world-hub.js',
  '/css/child-world-hub.css',
  '/js/child-morgonhus.js',
  '/css/child-morgonhus.css',
  '/css/child-living-world-transition.css',
  '/js/child-living-world-transition.js',
  '/js/scene-asset-pipeline.js',
  '/js/morgonhus-asset-pipeline.js',
  '/js/garden-asset-pipeline.js',
  '/js/memory-hall-asset-pipeline.js',
  '/js/living-world-scenes-catalog.js',
  '/js/living-world-room-pipelines.js',
  '/js/child-catalog-room.js',
  '/js/child-garden.js',
  '/css/child-garden.css',
  '/css/child-catalog-room.css',
  '/js/child-memory-hall.js',
  '/css/child-memory-hall.css',
  '/css/child-today-focus.css',
  '/css/child-world-bg.css',
  '/css/child-skatt-rooms.css',
  '/images/child/today/bg@2x.webp',
  '/images/child/world/hub@2x.webp',
  '/images/child/world/hub-castle@2x.webp',
  '/images/child/world/hub-treehouse@2x.webp',
  '/images/child/world/hub-space@2x.webp',
  '/images/child/family/hall@2x.webp',
  '/images/child/morgonhus/scene@2x.webp',
  '/images/child/world/rooms/chest@2x.webp',
  '/images/child/world/rooms/dreams@2x.webp',
  '/images/child/world/rooms/trophy@2x.webp',
  '/images/child/world/rooms/shelf@2x.webp',
  '/images/child/world/rooms/collections@2x.webp',
  '/images/child/world/rooms/story@2x.webp',
  '/images/child/world/rooms/avatar@2x.webp',
  '/images/child/world/rooms/pet@2x.webp',
  '/images/child/world/rooms/museum@2x.webp',
  '/images/child/world/rooms/shop@2x.webp',
  '/images/child/decals/today-empty-v1@2x.webp',
  '/images/child/decals/today-celebration-frame-v1@2x.webp',
  '/images/child/world/garden/scene-bg.webp',
  '/images/child/world/garden/scene-bg-430.webp',
  '/images/child/world/garden/scene-bg-860.webp',
  '/images/child/world/garden/scene-bg-1280.webp',
  '/images/child/world/garden/sunflower-bloom.svg',
  '/images/child/world/garden/sunflower-sprout.svg',
  '/images/child/world/garden/sunflower-stump.svg',
  '/images/child/world/memory-hall/scene@2x.webp',
  '/images/child/world/memory-hall/scene-430.webp',
  '/images/child/world/memory-hall/scene-860.webp',
  '/images/child/world/memory-hall/scene-1280.webp',
  '/images/child/world/hall/scene-bg.webp',
  '/images/child/world/hall/scene-bg-430.webp',
  '/images/child/world/hall/scene-bg-860.webp',
  '/images/child/world/hall/scene-bg-1280.webp',
  '/images/child/world/bedroom/scene-bg.webp',
  '/images/child/world/bedroom/scene-bg-430.webp',
  '/images/child/world/bedroom/scene-bg-860.webp',
  '/images/child/world/bedroom/scene-bg-1280.webp',
  '/images/child/world/kitchen/scene-bg.webp',
  '/images/child/world/kitchen/scene-bg-430.webp',
  '/images/child/world/bathroom/scene-bg.webp',
  '/images/child/world/attic/scene-bg.webp',
  '/images/child/world/home/scene-bg.webp',
  '/images/child/world/home/scene-bg-430.webp',
  '/images/child/world/home/scene-bg-860.webp',
  '/images/child/world/home/scene-bg-1280.webp',
  '/images/child/world/workshop/scene-bg.webp',
  '/images/child/world/workshop/scene-bg-430.webp',
  '/images/child/world/workshop/scene-bg-860.webp',
  '/images/child/world/workshop/scene-bg-1280.webp',
  '/images/child/world/pet-house/scene-bg.webp',
  '/images/child/world/pet-house/scene-bg-430.webp',
  '/images/child/world/pet-house/scene-bg-860.webp',
  '/images/child/world/pet-house/scene-bg-1280.webp',
  '/images/child/world/trophy-room/scene-bg.webp',
  '/images/child/world/trophy-room/scene-bg-430.webp',
  '/images/child/world/trophy-room/scene-bg-860.webp',
  '/images/child/world/trophy-room/scene-bg-1280.webp',
  '/img/barn/skattkammaren/scene-room.webp',
  '/img/barn/skattkammaren/plaque-crown.webp',
  '/img/barn/skattkammaren/deco-hourglass.webp',
  '/img/barn/skattkammaren/deco-chest-open.webp',
  '/img/barn/skattkammaren/deco-chest-closed.webp',
  '/img/barn/skattkammaren/history-chest-lid.webp',
  '/images/child/world/reading-corner/scene-bg.webp',
  '/images/child/world/reading-corner/scene-bg-430.webp',
  '/images/child/world/reading-corner/scene-bg-860.webp',
  '/images/child/world/reading-corner/scene-bg-1280.webp',
  '/images/child/world/forest/scene-bg.webp',
  '/images/child/world/forest/scene-bg-430.webp',
  '/images/child/world/forest/scene-bg-860.webp',
  '/images/child/world/forest/scene-bg-1280.webp',
  '/images/child/world/lake/scene-bg.webp',
  '/images/child/world/lake/scene-bg-430.webp',
  '/images/child/world/lake/scene-bg-860.webp',
  '/images/child/world/lake/scene-bg-1280.webp',
  '/images/child/world/museum/scene-bg.webp',
  '/images/child/world/museum/scene-bg-430.webp',
  '/images/child/world/museum/scene-bg-860.webp',
  '/images/child/world/museum/scene-bg-1280.webp',
  // Pedagog pages
  '/pedagog-note.html',
  '/pedagog-oversikt.html',
  '/js/skeleton.js',
  '/js/sse-client.js',
  '/js/child-dashboard-sse.js',
  '/js/help-bubble.js',
  '/js/help-journey-tip.js',
  '/js/feature-check.js',
  '/js/platform.js',
  '/js/device-mode.js',
  '/js/package-access-cache.js',
  '/js/session-gate.js',
  '/js/parental-gate.js',
  '/js/adult-biometric-client.js',
  '/js/adult-privilege-lease-policy.js',
  '/js/adult-pin-gate-ui.js',
  '/js/trusted-select-parent-diag.js',
  '/js/adult-privilege-lifecycle.js',
  '/js/adult-privilege.js',
  '/js/crash-reporter.js',
  '/js/native-tab-bar.js',
  '/js/deep-link-router.js',
  '/js/google-auth-ui.js',
  '/js/auth-login-platform.js',
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
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] precache skip:', url, err);
          })
        )
      );
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

  // Mockups: always fresh (marketing screenshots — no stale toolbar/JS)
  if (url.pathname.startsWith('/mockups/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

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
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot)$/)
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
